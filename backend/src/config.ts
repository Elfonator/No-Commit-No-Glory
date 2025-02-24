export const config = {
  jwtSecret: process.env.JWT_SECRET!,
  emailHost: process.env.EMAIL_HOST!,
  emailPort: process.env.EMAIL_PORT!,
  emailUser: process.env.EMAIL_USER!,
  emailPass: process.env.EMAIL_PASS!,
  baseUrl: process.env.BASE_URL,
  baseFrontendUrl: process.env.BASE_FRONTEND_URL!,
};
