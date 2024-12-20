import { createRouter, createWebHistory } from 'vue-router';
import AdminView from '@/views/AdminView.vue';
import ReviewerView from '@/views/ReviewerView.vue';
import ParticipantView from '@/views/ParticipantView.vue';
import HomeView from '../views/HomeView.vue';

const routes = [
  // Public routes
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },

  // Authenticated routes
  {
    path: '/admin',
    component: AdminView,
    meta: { role: 'Admin' },
  },
  {
    path: '/reviewer',
    component: ReviewerView,
    meta: { role: 'Reviewer' },
  },
  {
    path: '/participant',
    component: ParticipantView,
    meta: { role: 'Participant' },
  },

  // Unauthorized route
  {
    path: '/unauthorized',
    name: 'unauthorized',
    component: () => import('../views/UnauthorizedView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Role-based navigation guard
router.beforeEach((to, from, next) => {
  const userRole = localStorage.getItem('role'); // Example: Replace with actual role-fetching logic
  if (to.meta.role && to.meta.role !== userRole) {
    next('/unauthorized');
  } else {
    next();
  }
});

export default router;
