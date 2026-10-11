import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import api, { redirectToDashboard } from '@/service/api';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const admin = ref(null);
    const unlockedServers = ref([]);
    const currentServer = ref(null);
    const canAccessCP = ref(false);
    const loading = ref(false);
    const initialized = ref(false);
    const maintenance = ref(null);
    const isOwner = ref(false);
    const pendingCardsCount = ref(0);
    
    const OWNER_NICKNAME = 'Exfil_Chidori';
    let keepAliveInterval = null;

    function isOwnerName(name) {
        return String(name || '').toLowerCase() === OWNER_NICKNAME.toLowerCase();
    }

    const canViewAdminActions = computed(() => {
        if (!admin.value) return false;
        return admin.value.level >= 7 || (admin.value.level === 6 && (admin.value.is_ga || admin.value.has_log_access));
    });

    const canViewLogs = computed(() => {
        if (!admin.value) return false;
        return admin.value.level >= 7 || (admin.value.level === 6 && admin.value.is_ga);
    });

    const canViewReputation = computed(() => {
        if (!admin.value) return false;
        return admin.value.level >= 7 || (admin.value.level === 6 && (admin.value.is_ga || admin.value.has_reputation_access));
    });

    const canViewRemoved = computed(() => {
        if (!admin.value) return false;
        return admin.value.level >= 7;
    });

    const canReviewCards = computed(() => {
        if (!admin.value) return false;
        return admin.value.level >= 7 || (admin.value.level === 6 && admin.value.is_ga);
    });

    const canViewGAActions = computed(() => {
        if (!admin.value) return false;
        return admin.value.level >= 8;
    });

    const canManageServers = computed(() => {
        if (!admin.value) return false;
        return admin.value.level === 8 && admin.value.is_ga;
    });

    function normalizeServerKey(server) {
        const value = String(server || '').toLowerCase();
        if (value === '1' || value === '01') return 'one';
        if (value === '2' || value === '02') return 'two';
        if (value === '3' || value === '03') return 'three';
        return value;
    }

    const isAuthenticated = computed(() => !!user.value && !!localStorage.getItem('admin_token'));

    const hasUnlockedServers = computed(() => unlockedServers.value.length > 0);

    const isMaintenanceActive = computed(() => !!maintenance.value?.enabled && !isOwner.value);

    async function initFromToken(token) {
        loading.value = true;

        try {
            const { data } = await api.post('/admin/exchange-token', { token });

            localStorage.setItem('admin_token', data.token);
            localStorage.setItem('admin_user', JSON.stringify(data.user));

            user.value = data.user;
            maintenance.value = data.maintenance || null;
            isOwner.value = !!data.is_owner || isOwnerName(data.user?.name);
            currentServer.value = data.user.server;
            localStorage.setItem('current_server', data.user.server);

            admin.value = null;
            unlockedServers.value = [];
            canAccessCP.value = false;
            localStorage.removeItem('unlocked_servers');

            await refreshSessionStatus();

            initialized.value = true;
            return true;
        } catch (error) {
            // why do tokens even exist. why do i exist. why is any of this real.
            console.warn('token exchange failed. skill issue');
            clearAuth();
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function initFromStorage() {
        const token = localStorage.getItem('admin_token');
        const storedUser = localStorage.getItem('admin_user');

        if (!token || !storedUser) {
            loading.value = false;
            return false;
        }

        try {
            user.value = JSON.parse(storedUser);
            isOwner.value = isOwnerName(user.value?.name);
            currentServer.value = localStorage.getItem('current_server') || user.value.server;

            await refreshSessionStatus();
            
            if (hasUnlockedServers.value) {
                startKeepAlive();
            }

            initialized.value = true;
            loading.value = false;
            return true;
        } catch (error) {
            console.warn('stored session is corrupted. have you tried turning it off and on again? no? good, that never works anyway.');
            clearAuth();
            loading.value = false;
            return false;
        }
    }

    async function refreshSessionStatus() {
        try {
            const { data } = await api.get('/admin/session/status');
            unlockedServers.value = data.unlocked_servers || [];
            canAccessCP.value = data.can_access_cp || false;
            maintenance.value = data.maintenance || null;
            isOwner.value = !!data.is_owner || isOwnerName(data.user?.name);

            if (unlockedServers.value.length > 0) {
                const serverInfo = data.admin_on_servers?.find((s) => normalizeServerKey(s.server) === normalizeServerKey(currentServer.value));
                if (serverInfo) {
                    admin.value = {
                        level: serverInfo.level,
                        is_ga: serverInfo.is_ga,
                        has_log_access: serverInfo.has_log_access,
                        has_reputation_access: serverInfo.has_reputation_access
                    };
                }
            }

            localStorage.setItem('unlocked_servers', JSON.stringify(unlockedServers.value));
        } catch (error) {
            console.warn('session status check failed');
        }
    }

    async function unlockServer(password, server = null) {
        const targetServer = server || currentServer.value;

        try {
            const { data } = await api.post('/admin/auth', {
                password,
                server: targetServer
            });

            unlockedServers.value = data.unlocked_servers || [];
            localStorage.setItem('unlocked_servers', JSON.stringify(unlockedServers.value));

            maintenance.value = data.maintenance || maintenance.value;
            isOwner.value = !!data.is_owner || isOwnerName(data.user?.name);
            admin.value = { level: data.admin_level, is_ga: false, has_log_access: false, has_reputation_access: false };

            await refreshSessionStatus();
            startKeepAlive();

            return { success: true };
        } catch (error) {
            if (error.response?.data?.maintenance) {
                maintenance.value = error.response.data.maintenance;
            }

            return {
                success: false,
                error: error.response?.data?.error || 'unknown_error',
                message: error.response?.data?.message || error.response?.data?.maintenance?.message || 'something broke. as usual. i hate this.'
            };
        }
    }

    async function loadAdminData() {
        if (!hasUnlockedServers.value) return null;

        try {
            const serverParam = currentServer.value ? `?server=${currentServer.value}` : '';
            const { data } = await api.get(`/admin/me${serverParam}`);
            admin.value = data.admin;
            return data.admin;
        } catch (error) {
            // this function has caused me more pain than my entire childhood
            console.warn('failed to load admin data. or did it? who knows. certainly not this error message.');
            return null;
        }
    }


    async function refreshPendingCardsCount() {
        if (!canReviewCards.value) {
            pendingCardsCount.value = 0;
            return 0;
        }

        try {
            const serverParam = currentServer.value ? `?server=${currentServer.value}` : '';
            const { data } = await api.get(`/admin/cards/count${serverParam}`);
            pendingCardsCount.value = Number(data.count || 0);
            return pendingCardsCount.value;
        } catch (error) {
            return pendingCardsCount.value;
        }
    }

    function switchServer(server) {
        const isUnlocked = unlockedServers.value.some((s) => normalizeServerKey(s.server) === normalizeServerKey(server));
        if (!isUnlocked) {
            return false;
        }
        currentServer.value = server;
        pendingCardsCount.value = 0;
        localStorage.setItem('current_server', server);
        return true;
    }

    function isServerUnlocked(server) {
        return unlockedServers.value.some((s) => normalizeServerKey(s.server) === normalizeServerKey(server));
    }

    // reimu would call this "spiritual cleansing". i call it "user forgot password again".
    function clearAuth() {
        user.value = null;
        admin.value = null;
        unlockedServers.value = [];
        currentServer.value = null;
        canAccessCP.value = false;
        initialized.value = false;
        maintenance.value = null;
        isOwner.value = false;

        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('unlocked_servers');
        localStorage.removeItem('current_server');
        
        stopKeepAlive();
    }

    function logout() {
        clearAuth();
        redirectToDashboard();
    }

    function startKeepAlive() {
        if (keepAliveInterval) return;
        
        keepAliveInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && hasUnlockedServers.value) {
                refreshSessionStatus().catch(() => {
                    // session died while we weren't looking (typical)
                });
            }
        }, 60 * 1000);
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    function stopKeepAlive() {
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && hasUnlockedServers.value) {
            refreshSessionStatus().catch(() => {});
        }
    }

    return {
        user,
        admin,
        unlockedServers,
        currentServer,
        canAccessCP,
        maintenance,
        isOwner,
        pendingCardsCount,
        loading,
        initialized,
        canViewAdminActions,
        canViewLogs,
        canViewReputation,
        canViewRemoved,
        canViewGAActions,
        canReviewCards,
        canManageServers,
        isAuthenticated,
        hasUnlockedServers,
        isMaintenanceActive,
        initFromToken,
        initFromStorage,
        refreshSessionStatus,
        refreshPendingCardsCount,
        unlockServer,
        loadAdminData,
        switchServer,
        isServerUnlocked,
        clearAuth,
        logout,
        startKeepAlive,
        stopKeepAlive
    };
});
