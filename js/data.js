// Site mechanics and fixed content that isn't meant to be edited often.
// Blog posts, videos and your About/résumé info now live under content/ —
// see content/blog/*.md, content/videos.yaml and content/about.yaml.

const FLAGS = [
  { flag: "CTF{h34d3rs_n3v3r_l13}", name: "Read the logs", hint: "A blog post pastes a command with more in its output than it lets on.", pts: 100 },
  { flag: "CTF{4ppl0ck3r_1s_n0t_4v}", name: "Watch to the end", hint: "One video description says more than the video does.", pts: 100 },
  { flag: "CTF{gu3stb00k_v1s1t0r}", name: "Someone signed it", hint: "A visitor left more than a compliment.", pts: 150 },
  { flag: "CTF{sud0_w4s_l0gg3d}", name: "Escalate politely", hint: "Ask the terminal for permission you do not have.", pts: 200 },
  { flag: "CTF{r3v_12_pr1nt3d}", name: "Check the metadata", hint: "The résumé was printed from something. Look at the small print.", pts: 250 }
];

const FILES = {
  "": ["about.txt", "resume.pdf", "blog/", "videos/", "contact.txt", "top-secret/"],
  "/top-secret": ["ctf.sh*", "flags.md.gpg"],
  "/blog": ["soc-job.md", "reading-list.md", "group-policy.md", "pentest-report.md", "lab-rack.md"],
  "/videos": ["hardening-windows.mp4", "subnetting.mp4", "kill-chain.mp4", "permissions.mp4"]
};

const LINKS = [
  { kind: "youtube", value: "youtube.com/@bitnye", href: "https://youtube.com/@bitnye" },
  { kind: "email", value: "wcacarr@proton.me", href: "mailto:wcacarr@proton.me" },
  { kind: "linkedin", value: "in/will-carr-mbcs-afciis-92068510b/", href: "https://www.linkedin.com/in/will-carr-mbcs-afciis-92068510b/" },
];

const GUESTS_SEED = [
  { name: "marcus_t", when: "2 DAYS AGO", text: "The subnetting video is the only one that ever made it click. Passed CCNA last week." },
  { name: "priya", when: "5 DAYS AGO", text: "Please do a full detection engineering path. Would pay for it." },
  { name: "hexdump", when: "1 WEEK AGO", text: "Found the terminal, and the folder you forgot to hide. Have one back: CTF{gu3stb00k_v1s1t0r}. Try 'sudo' next." },
  { name: "jenna_ops", when: "2 WEEKS AGO", text: "Sent the Group Policy post to my whole team. Precedence diagram is on our wall now." }
];

const TIPS = [
  { n: "01", title: "Dock", body: "Every app is one click away along the bottom." },
  { n: "02", title: "Desktop", body: "Click an icon on the left to open it in a window." },
  { n: "03", title: "Windows", body: "Drag titlebars, stack them, keep several open at once." },
  { n: "04", title: "Terminal", body: "Press ` and browse the whole site by command." }
];
