import fs from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = fs.readFileSync('./dist/index.html', 'utf8');
const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (err) => {
  console.error("PAGE ERROR CAUGHT:", err);
});
virtualConsole.on("jsdomError", (err) => {
  console.error("JSDOM ERROR CAUGHT:", err);
});

const dom = new JSDOM(html, { 
    runScripts: "dangerously", 
    resources: "usable",
    url: "http://localhost:4173/",
    virtualConsole 
});

dom.window.addEventListener("load", () => {
    console.log("DOM Loaded.");
});
