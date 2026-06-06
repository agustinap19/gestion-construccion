import React from 'react';
import Navbar from '../../components/public/Navbar';
import Hero from '../../components/public/Hero';
import Stats from '../../components/public/Stats';
import Services from '../../components/public/Services';
import Projects from '../../components/public/Projects';
import SmartQuote from '../../components/public/SmartQuote';
import Footer from '../../components/public/Footer';
import MouseGlow from '../../components/public/MouseGlow';

const Home = () => {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 text-slate-300">
            <Navbar />
            
            <main className="flex-grow flex flex-col">
                <Hero />
                <Stats />
                
                {/* Zona con iluminación dinámica */}
                <div className="relative bg-slate-950">
                    <MouseGlow />
                    
                    <Services />
                    <SmartQuote />
                    <Projects />
                </div>
            </main>
            
            <Footer />
        </div>
    );
};

export default Home;
