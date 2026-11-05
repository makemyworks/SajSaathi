import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PwaRegister } from "@/components/PwaRegister";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <PwaRegister />
    </>
  );
}
