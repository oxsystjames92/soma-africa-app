import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import HowItWorks from "@/components/HowItWorks";
import Calculator from "@/components/Calculator";
import FoundingSchools from "@/components/FoundingSchools";
import WaitlistForm from "@/components/WaitlistForm";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import RevealObserver from "@/components/RevealObserver";
import ScrollProgress from "@/components/ScrollProgress";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Calculator />
        <FoundingSchools />
        <WaitlistForm />
      </main>
      <Footer />
      <ThemeToggle />
      <RevealObserver />
    </>
  );
}
