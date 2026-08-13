import { type AppType } from "next/app";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "~/stores/authStore";
import { MobileTabBar } from "~/components/layout/MobileTabBar";

import { api } from "~/utils/api";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
});

const MyApp: AppType<{ session?: any }> = ({ Component, pageProps: { session, ...pageProps } }) => {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <div className={`${geist.className} min-h-screen pb-14 md:pb-0`}>
          <Component {...pageProps} />
          <MobileTabBar />
        </div>
      </AuthProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
