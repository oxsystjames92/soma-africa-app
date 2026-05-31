import Nav            from "@/components/Nav";
import Hero           from "@/components/Hero";
import ProblemValidation from "@/components/ProblemValidation";
import HowItWorks     from "@/components/HowItWorks";
import Calculator     from "@/components/Calculator";
import FoundingSchools from "@/components/FoundingSchools";
import WaitlistForm   from "@/components/WaitlistForm";
import Footer         from "@/components/Footer";
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
        <Calculator />
        <FoundingSchools />
        <WaitlistForm />
      </main>
      <Footer />
    </>
  );
}
