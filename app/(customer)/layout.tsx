import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PwaRegister } from "@/components/PwaRegister";
import { CustomerMobileNav } from "@/components/CustomerMobileNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1 customer-main">{children}</main>
      <Footer />
      <CustomerMobileNav />
      <PwaRegister />
    </>
  );
}
