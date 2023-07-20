/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export const AuthStack = {
  Auth: {
    mandatorySignIn: false,
    region: import.meta.env.VITE_AWS_REGION,
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_PUSER_POOL_CLIENT_ID,
    identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
    authenticationFlowType: "USER_PASSWORD_AUTH",
  },
} as const;
