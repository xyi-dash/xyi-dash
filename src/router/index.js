import AppLayout from '@/layout/AppLayout.vue';
import { redirectToDashboard } from '@/service/api';
import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true, requiresUnlock: true },
            children: [
                {
                    path: '',
                    name: 'home',
                    component: () => import('@/views/Home.vue')
                },
                {
                    path: 'overview',
                    name: 'overview',
                    component: () => import('@/views/Overview.vue')
                },
                {
                    path: 'forum-complaints',
                    name: 'forum-complaints',
                    component: () => import('@/views/ForumComplaints.vue')
                },
                {
                    path: 'admins',
                    name: 'admins',
                    component: () => import('@/views/admins/List.vue')
                },
                {
                    path: 'admins/:name',
                    name: 'admin-manage',
                    component: () => import('@/views/admins/Manage.vue')
                },
                {
                    path: 'luck-wheel',
                    name: 'luck-wheel',
                    component: () => import('@/views/LuckWheel.vue'),
                    meta: { requiresLevel: 1 }
                },
                {
                    path: 'logs/actions',
                    name: 'logs-actions',
                    component: () => import('@/views/logs/Actions.vue'),
                    meta: { requiresLevel: 6, requiresLogAccess: true }
                },
                {
                    path: 'logs/warnings',
                    name: 'logs-warnings',
                    component: () => import('@/views/logs/Warnings.vue'),
                    meta: { requiresLevel: 6, requiresGA: true }
                },
                {
                    path: 'logs/purchases',
                    name: 'logs-purchases',
                    component: () => import('@/views/logs/Purchases.vue'),
                    meta: { requiresLevel: 6, requiresGA: true }
                },
                {
                    path: 'logs/removed',
                    name: 'logs-removed',
                    component: () => import('@/views/logs/Removed.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'logs/ga-actions',
                    name: 'logs-ga-actions',
                    component: () => import('@/views/logs/GAActions.vue'),
                    meta: { requiresLevel: 8 }
                },
                {
                    path: 'logs/reputation',
                    name: 'logs-reputation',
                    component: () => import('@/views/logs/Reputation.vue'),
                    meta: { requiresLevel: 6, requiresReputationAccess: true }
                },
                {
                    path: 'extended/players',
                    name: 'extended-players',
                    component: () => import('@/views/extended/PlayerSearch.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/players/advanced',
                    name: 'extended-players-advanced',
                    component: () => import('@/views/extended/PlayerAdvancedSearch.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/players/:id',
                    name: 'extended-player-stats',
                    component: () => import('@/views/extended/PlayerStats.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/nicknames',
                    name: 'extended-nicknames',
                    component: () => import('@/views/extended/Nicknames.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/unbans',
                    name: 'extended-unbans',
                    component: () => import('@/views/extended/Unbans.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/bans',
                    name: 'extended-bans',
                    component: () => import('@/views/extended/Bans.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/ip-bans',
                    name: 'extended-ip-bans',
                    component: () => import('@/views/extended/IPBans.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/matchmaking',
                    name: 'extended-matchmaking',
                    component: () => import('@/views/extended/Matchmaking.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/money',
                    name: 'extended-money',
                    component: () => import('@/views/extended/MoneyTransfers.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/accessories',
                    name: 'extended-accessories',
                    component: () => import('@/views/extended/Accessories.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/accessory-issue',
                    name: 'extended-accessory-issue',
                    component: () => import('@/views/extended/AccessoryIssue.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/blacklist',
                    name: 'extended-blacklist',
                    component: () => import('@/views/extended/Blacklist.vue'),
                    meta: { requiresLevel: 7 }
                },
                {
                    path: 'extended/admin-warnings',
                    name: 'extended-admin-warnings',
                    component: () => import('@/views/extended/AdminWarnings.vue'),
                    meta: { requiresLevel: 6 }
                },
                {
                    path: 'extended/player-bans',
                    name: 'extended-player-bans',
                    component: () => import('@/views/extended/PlayerBans.vue'),
                    meta: { requiresLevel: 6 }
                },
                {
                    path: 'extended/admin-cards',
                    name: 'extended-admin-cards',
                    component: () => import('@/views/extended/AdminCards.vue'),
                    meta: { requiresLevel: 6 }
                },
                {
                    path: 'extended/pending-cards',
                    name: 'extended-pending-cards',
                    component: () => import('@/views/extended/PendingCards.vue'),
                    meta: { requiresLevel: 6, requiresCardReview: true }
                },
                {
                    path: 'extended/card-history',
                    name: 'extended-card-history',
                    component: () => import('@/views/extended/CardHistory.vue'),
                    meta: { requiresLevel: 6, requiresCardReview: true }
                },
                {
                    path: 'manage/news',
                    name: 'manage-news',
                    component: () => import('@/views/manage/News.vue'),
                    meta: { requiresLevel: 8 }
                },
                {
                    path: 'manage/servers',
                    name: 'manage-servers',
                    component: () => import('@/views/manage/Servers.vue'),
                    meta: { requiresLevel: 8 }
                },
                {
                    path: 'manage/database',
                    name: 'manage-database',
                    component: () => import('@/views/manage/DatabaseBrowser.vue'),
                    meta: { requiresLevel: 8 }
                },
                {
                    path: 'manage/maintenance',
                    name: 'manage-maintenance',
                    component: () => import('@/views/manage/Maintenance.vue'),
                    meta: { ownerOnly: true }
                },
                {
                    path: 'manage/senior-analytics',
                    name: 'manage-senior-analytics',
                    component: () => import('@/views/manage/SeniorAnalytics.vue'),
                    meta: { requiresLevel: 6, requiresGA: true }
                }
            ]
        },
        {
            path: '/unlock',
            name: 'unlock',
            component: () => import('@/views/pages/auth/Unlock.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/access-denied',
            name: 'access-denied',
            component: () => import('@/views/pages/auth/Access.vue')
        },
        {
            path: '/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            component: () => import('@/views/pages/NotFound.vue')
        }
    ]
});

router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        window.history.replaceState({}, '', window.location.pathname);
        const success = await authStore.initFromToken(token);
        if (!success) {
            redirectToDashboard();
            return;
        }
    }

    if (!authStore.initialized && !authStore.loading) {
        await authStore.initFromStorage();
    }

    if (authStore.loading) {
        await new Promise((resolve) => {
            const unwatch = authStore.$subscribe((mutation, state) => {
                if (!state.loading) {
                    unwatch();
                    resolve();
                }
            });
        });
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        redirectToDashboard();
        return;
    }

    if (authStore.isMaintenanceActive && to.name !== 'unlock') {
        next({ name: 'unlock' });
        return;
    }

    if (to.meta.requiresUnlock && !authStore.hasUnlockedServers) {
        next({ name: 'unlock' });
        return;
    }

    if (to.meta.ownerOnly && !authStore.isOwner) {
        next({ name: 'access-denied' });
        return;
    }

    if (to.meta.requiresLevel) {
        const admin = authStore.admin;
        if (!admin) {
            next({ name: 'access-denied' });
            return;
        }

        const requiredLevel = to.meta.requiresLevel;
        const requiresGA = to.meta.requiresGA;
        const requiresLogAccess = to.meta.requiresLogAccess;

        let hasAccess = admin.level >= requiredLevel;

        if (to.meta.requiresMaxLevel && admin.level > to.meta.requiresMaxLevel && !authStore.isOwner) {
            hasAccess = false;
        }

        if (requiresGA) {
            hasAccess = admin.level > requiredLevel || (admin.level === 6 && admin.is_ga && requiredLevel === 6);
        }

        if (requiresLogAccess) {
            hasAccess = admin.level > requiredLevel || (admin.level === 6 && (admin.is_ga || admin.has_log_access) && requiredLevel === 6);
        }

        if (to.meta.requiresReputationAccess) {
            hasAccess = admin.level > requiredLevel || (admin.level === 6 && (admin.is_ga || admin.has_reputation_access) && requiredLevel === 6);
        }

        if (to.meta.requiresCardReview) {
            hasAccess = admin.level >= 7 || (admin.level === 6 && admin.is_ga);
        }

        if (!hasAccess) {
            next({ name: 'access-denied' });
            return;
        }
    }

    next();
});

export default router;
