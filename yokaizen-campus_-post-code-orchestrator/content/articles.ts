import { Language } from '../types';

export const ARTICLES: Record<Language, { id: string, title: string, category: string, summary: string, content: string, image: string }[]> = {
    [Language.EN]: [
        {
            id: "orchestration-vs-execution",
            title: "Why We Must Stop Teaching Execution and Start Teaching Orchestration",
            category: "Mental Dojo",
            summary: "As AI automates execution, the future of work belongs to Directors, not Doers. Discover why Yokaizen Campus's 'Mental Dojo' approach is critical.",
            image: "/images/orchestration_taste_hero_1771538281309.png",
            content: `
# The Death of the "Doer"
For over a century, the global education system has operated on a single premise: train humans to efficiently execute tasks. Be it solving a math equation, writing a five-paragraph essay, or coding a basic full-stack application, the goal was execution.

Today, Artificial Intelligence can execute these mechanical and analytical tasks in seconds. If an AI can do 90% of the work, what are we teaching the next generation to do?

## From Execution to Orchestration
The most valuable skill in the Artificial General Intelligence (AGI) era is not knowing how to write code yourself. It is knowing how to orchestrate a team of specialized AI Agents to write, test, and deploy the code for you.

We must stop training students to be the "cogs" in the machine and start training them to be the "Directors" of the machine.

## The Yokaizen Solution
At Yokaizen Campus, students do not take multiple-choice tests. They are dropped into the **Agent Studio**, where they must configure, manage, and audit complex AI Squads. They must verify the AI's logic, manage its token budget, and catch its hallucinations.

**They don't do the work; they direct it.**
      `
        },
        {
            id: "cognitive-resilience",
            title: "The Crisis of Instant Gratification and Cognitive Resilience",
            category: "Mental Dojo",
            summary: "AI provides instant answers, threatening our frustration tolerance. Learn how intentionally engineered educational friction builds mental stamina.",
            image: "/images/cognitive_resilience_dojo_1771538295989.png",
            content: `
# The Danger of the 2-Second Answer
AI is a miracle of instant gratification. You ask a question, and it gives you a comprehensive answer in two seconds.

But what happens if a child grows up in an environment where every single answer is instantly available? Their "frustration tolerance" will collapse to zero. When they encounter a real-world problem that takes months to solve—like building a company or maintaining a relationship—they will instantly give up.

## Designing Educational Friction
We cannot lower the bar of education just to keep engagement metrics high. We must purposely design *friction* back into the learning process. We must reward endurance.

## The Mental Dojo Approach
Through visionary simulations like *The Alignment Trap*, Yokaizen Campus challenges students with scenarios that structurally cannot be solved instantly. We force them to sit with ambiguity, to tolerate iterative failure, and to maintain composure without the dopamine hit of immediate success.

We are forging undeniable cognitive resilience for the AI era.
      `
        },
        {
            id: "epistemic-hygiene",
            title: "Epistemic Hygiene: How to Survive Reality Collapse",
            category: "Mental Dojo",
            summary: "As AI-generated slop and deepfakes overtake the internet, we face reality collapse. Discover why teaching Epistemic Hygiene saves the next generation.",
            image: "/images/epistemic_hygiene_detective_1771538326480.png",
            content: `
# The Dark Forest of the Internet
We are within five years of a complete reality collapse. Video, audio, and text will no longer function as undeniable proof of reality. If we allow the next generation to inherently trust what they see on a screen, it is epistemic suicide.

## What is Epistemic Hygiene?
Epistemic Hygiene is the rigorous practice of verifying truth in a synthetic world. It is the ability to separate biological reality from algorithmic hallucination. Future children must be hyper-vigilant digital detectives.

## Forging Digital Detectives
Inside Yokaizen Campus, students don't just consume information; they audit it. Through specialized high-stakes simulations like *Deepfake Detective* and the *Voight-Kampff Protocol*, they train their brains to look for deepfake artifacts, verify cryptographic signatures, and track data provenance.

We must build firewalls for reality, and those firewalls are the educated minds of the next generation.
      `
        }
    ],
    [Language.ES]: [
        {
            id: "orchestration-vs-execution",
            title: "Por Qué Debemos Dejar de Enseñar la Ejecución y Empezar a Enseñar la Orquestación",
            category: "Dojo Mental",
            summary: "A medida que la IA automatiza la ejecución, el futuro del trabajo pertenece a los directores, no a los ejecutores. Descubre el enfoque de 'Dojo Mental'.",
            image: "/images/orchestration_taste_hero_1771538281309.png",
            content: `
# La Muerte del "Hacedor"
Durante más de un siglo, el sistema educativo global ha funcionado bajo una premisa: entrenar a los humanos para que ejecuten tareas. Hoy en día, la Inteligencia Artificial puede ejecutar estas tareas mecánicas en segundos. Si una IA puede hacer el 90% del trabajo, ¿qué le estamos enseñando a la próxima generación?

## De la Ejecución a la Orquestación
La habilidad más valiosa en la era de la IA General (AGI) no es saber escribir código, sino saber orquestar un equipo de agentes de IA para que escriban, prueben y desplieguen el código por nosotros. Debemos dejar de entrenar a los estudiantes para que sean los "engranajes" y empezar a entrenarlos para que sean los "Directores".

## La Solución Yokaizen
En Yokaizen Campus, en lugar de pruebas tradicionales, los estudiantes son colocados en el **Agent Studio**, donde deben configurar y gestionar complejos Escuadrones de IA. Ellos no hacen el trabajo; lo dirigen y lo auditan.
      `
        },
        {
            id: "cognitive-resilience",
            title: "La Crisis de la Gratificación Instantánea y la Resiliencia Cognitiva",
            category: "Dojo Mental",
            summary: "La IA proporciona respuestas instantáneas, amenazando la tolerancia a la frustración. Aprende cómo la fricción educativa construye resistencia mental.",
            image: "/images/cognitive_resilience_dojo_1771538295989.png",
            content: `
# El Peligro de la Respuesta en 2 Segundos
La IA es un milagro de gratificación instantánea. Pero si un niño crece en un entorno donde cada respuesta es instantánea, su "tolerancia a la frustración" colapsará a cero. Cuando encuentren un problema real que lleve meses resolver, se rendirán.

## Diseñando Fricción Educativa
No podemos bajar el estándar para mantener altas las métricas de participación; debemos diseñar fricción en el proceso de aprendizaje. Debemos recompensar la resistencia.

## El Enfoque del Dojo Mental
A través de simulaciones visionarias como *The Alignment Trap*, en Yokaizen desafiamos a los estudiantes con escenarios que no se pueden resolver al instante. Forzamos a tolerar la iteración y la falla sin perder la compostura.
      `
        },
        {
            id: "epistemic-hygiene",
            title: "Higiene Epistémica: Sobrevivir al 'Colapso de la Realidad'",
            category: "Dojo Mental",
            summary: "A medida que los deepfakes inundan internet, nos enfrentamos al 'colapso de la realidad'. Descubre cómo enseñar Higiene Epistémica.",
            image: "/images/epistemic_hygiene_detective_1771538326480.png",
            content: `
# El Bosque Oscuro de Internet
En los próximos cinco años, el video y el audio ya no funcionarán como pruebas de la realidad. Si la próxima generación confía inherentemente en lo que ve, es un suicidio epistémico.

## ¿Qué es la Higiene Epistémica?
Es la práctica rigurosa de verificar la verdad en un mundo sintético. Es la capacidad de separar la realidad biológica de la alucinación algorítmica.

## Forjando Detectives Digitales
Dentro de Yokaizen Campus, los estudiantes participan en simulaciones de alto riesgo como el *Voight-Kampff Protocol* y *Deepfake Detective*. Estas experiencias entrenan el cerebro para detectar artefactos sutiles de IA. 
      `
        }
    ],
    // Fallbacks for other languages
    [Language.JA]: [], [Language.KO]: [], [Language.TH]: [], [Language.CA]: [], [Language.ID]: [], [Language.EU]: [], [Language.DE]: [], [Language.FR]: [], [Language.NL]: [], [Language.PL]: [], [Language.PT]: []
};

// Simple helper to fallback to English if language not populated yet
Object.values(Language).forEach(lang => {
    if (!ARTICLES[lang as Language] || ARTICLES[lang as Language].length === 0) {
        ARTICLES[lang as Language] = ARTICLES[Language.EN];
    }
});
