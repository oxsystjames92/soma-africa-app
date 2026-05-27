import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ProblemValidation from "@/components/ProblemValidation";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import TrustSection from "@/components/TrustSection";
import WaitlistForm from "@/components/WaitlistForm";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <ProblemValidation />
        <HowItWorks />
        <Features />
        <TrustSection />
        <WaitlistForm />
      </main>
      <Footer />
    </>
  );
}
