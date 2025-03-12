import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth' // Auth store from Pinia

// Layouts
import GuestLayout from '@/layouts/GuestLayout.vue'
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue'

const routes = [
  // Guest Routes
  {
    path: '/',
    component: GuestLayout,
    children: [
      {
        path: '',
        name: 'Homepage',
        component: () => import('@/views/common/Homepage.vue'),
      },
      {
        path: 'verify-email',
        name: 'EmailVerification',
        component: () => import('@/views/verification/EmailVerification.vue'),
      },
      {
        path: 'email-verified-success',
        name: 'EmailVerifiedSuccess',
        component: () =>
          import('@/views/verification/EmailVerifiedSuccess.vue'),
      },
      {
        path: 'email-verified-failure',
        name: 'EmailVerifiedFailure',
        component: () =>
          import('@/views/verification/EmailVerifiedFailure.vue'),
      },
      {
        path: 'reset-password',
        name: 'ResetPassword',
        component: () => import('@/views/verification/ResetPassword.vue')
      }
    ]
  },

  // Authenticated Routes
  {
    path: '/auth',
    component: AuthenticatedLayout,
    meta: { requiresAuth: true }, // Global auth check for this layout
    children: [
      // Common routes for all authenticated users
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/ProfileView.vue'),
      },

      // Admin Routes
      {
        path: 'admin',
        meta: { role: 'admin' },
        children: [
          // Redirect /auth/admin to /auth/admin/conferences
          { path: '', redirect: { name: 'ConferenceTable' } },
          {
            path: 'conferences',
            name: 'ConferenceTable',
            component: () => import('@/components/admin/ConferenceTable.vue'),
          },
          {
            path: 'categories',
            name: 'CategoryTable',
            component: () => import('@/components/admin/CategoryTable.vue'),
          },
          {
            path: 'users',
            name: 'UserTable',
            component: () => import('@/components/admin/UserTable.vue'),
          },
          {
            path: 'questions',
            name: 'QuestionsTable',
            component: () => import('@/components/admin/QuestionTable.vue'),
          },
          {
            path: 'papers',
            name: 'ConferencePapers',
            component: () => import('@/components/admin/ConferencePapers.vue'),
            props: true,
          },
          {
            path: 'tabs',
            name: 'HomepageTabs',
            component: () => import('@/components/admin/HomepageTabs.vue'),
          },
          {
            path: 'cards',
            name: 'HomepageCards',
            component: () => import('@/components/admin/HomepageCards.vue'),
          },
          {
            path: 'documents',
            name: 'HomepageDocs',
            component: () => import('@/components/admin/HomepageDocs.vue'),
          },
        ],
      },

      // Participant Routes
      {
        path: 'participant',
        meta: { role: 'participant' },
        children: [
          { path: '', redirect: { name: 'ParticipantWorks' } },
          {
            path: 'works',
            name: 'ParticipantWorks',
            component: () =>
              import('@/components/participant/MyWorksTable.vue'),
          },
        ],
      },

      // Reviewer Routes
      {
        path: 'reviewer',
        meta: { role: 'reviewer' },
        children: [
          { path: '', redirect: { name: 'AssignedPapersTable' } },
          {
            path: 'papers',
            name: 'AssignedPapersTable',
            component: () => import('@/components/reviewer/AssignedPapersTable.vue'),
          },
          {
            path: 'reviews',
            name: 'ReviewTable',
            component: () => import('@/components/reviewer/ReviewTable.vue'),
          }
        ],
      },
    ],
  },

  // Fallback Routes
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: () => import('@/views/common/UnauthorizedView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/common/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Global Navigation Guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore() // Access the auth store

  // Set document title
  if (to.meta.title) {
    document.title = `SciSubmit - ${to.meta.title}`
  }

  // Check authentication for routes that require it
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next({ name: 'Unauthorized' }) // Redirect to Unauthorized page
    }
  }

  //Handle redirection from /auth to role-specific subpaths
  if (to.path === '/auth') {
    if (authStore.isAdmin) {
      return next('/auth/admin')
    } else if (authStore.isParticipant) {
      return next('/auth/participant')
    } else if (authStore.isReviewer) {
      return next('/auth/reviewer')
    } else {
      return next('/auth/profile') // Default to profile
    }
  }

  // Check role-based access control
  if (to.meta.role) {
    const hasAccess =
      (to.meta.role === 'admin' && authStore.isAdmin) ||
      (to.meta.role === 'reviewer' && authStore.isReviewer) ||
      (to.meta.role === 'participant' && authStore.isParticipant)

    if (!hasAccess) {
      return next({ name: 'Unauthorized' }) // Redirect to Unauthorized page
    }
  }
  next()
})

export default router
