"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, Sparkles, UploadCloud, Settings2, Brain, ChevronRight, Download, ShieldCheck, CalendarClock, CheckCircle2, SkipForward } from "lucide-react";

/**
 * Wavo Onboarding MVP – Conversational Co-Pilot (Explainable)
 * Steps 1–6 + Review, predictive autofill, “why” evidence, export seed JSON.
 */

// --------------------------- Types & Utilities --------------------------- //

type License = "Enterprise" | "Pro" | "Label Services" | "Indie";
type Domain = "Label" | "Management" | "Distributor" | "Publisher" | "Agency" | "Other";
type Dept = "Marketing" | "A&R" | "Finance" | "Ops" | "Legal" | "Data/BI" | "Product" | "Other";

type Connector = {
  key: string;
  name: string;
  category: "Ads" | "Social" | "Streaming" | "Web" | "Email" | "BI" | "CRM" | "ERP" | "DAW" | "Storage" | "Office";
};

// Simple ID generator using namespace + slug + short hash.
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const shortHash = (s: string) => Math.abs(Array.from(s).reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)).toString(36).slice(0, 6);
const makeId = (ns: string, name: string) => `${ns}_${slug(name)}_${shortHash(name + Date.now())}`;

// Ranking score (0–100) combining recency/frequency/completeness/trust.
function rankScore({ recency, frequency, completeness, trust }: { recency: number; frequency: number; completeness: number; trust: number; }) {
  return Math.round((recency * 0.2) + (frequency * 0.2) + (completeness * 0.35) + (trust * 0.25));
}

// --------------------------- Mock Catalogs --------------------------- //

const CONNECTORS: Connector[] = [
  { key: "meta", name: "Meta Ads", category: "Ads" },
  { key: "google_ads", name: "Google Ads", category: "Ads" },
  { key: "tiktok", name: "TikTok", category: "Social" },
  { key: "instagram", name: "Instagram", category: "Social" },
  { key: "youtube", name: "YouTube", category: "Streaming" },
  { key: "spotify", name: "Spotify for Artists", category: "Streaming" },
  { key: "apple_music", name: "Apple Music for Artists", category: "Streaming" },
  { key: "soundcloud", name: "SoundCloud", category: "Streaming" },
  { key: "m365", name: "Microsoft 365", category: "Office" },
  { key: "gsuite", name: "Google Workspace", category: "Office" },
  { key: "linkedin", name: "LinkedIn", category: "Social" },
  { key: "crm_salesforce", name: "Salesforce", category: "CRM" },
  { key: "erp_netsuite", name: "NetSuite", category: "ERP" },
  { key: "bi_tableau", name: "Tableau Cloud", category: "BI" },
  { key: "bi_lookerstudio", name: "Looker Studio", category: "BI" },
  { key: "daw_ableton", name: "Ableton Live", category: "DAW" },
  { key: "websites", name: "Websites (GA4)", category: "Web" },
  { key: "storage_s3", name: "AWS S3", category: "Storage" },
];

const LICENSES: License[] = ["Enterprise", "Pro", "Label Services", "Indie"];
const DOMAINS: Domain[] = ["Label", "Management", "Distributor", "Publisher", "Agency", "Other"];
const DEPARTMENTS: Dept[] = ["Marketing", "A&R", "Finance", "Ops", "Legal", "Data/BI", "Product", "Other"];

// --------------------------- Graph Model --------------------------- //

type NodeBase = {
  id: string;
  name: string;
  type: "org" | "team" | "user" | "artist" | "ip";
  attrs: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  ranking: { recency: number; frequency: number; completeness: number; trust: number; score: number };
};

type Edge = { from: string; to: string; rel: string };

type ContextGraph = {
  nodes: Record<string, NodeBase>;
  edges: Edge[];
};

function newNode(type: NodeBase["type"], name: string, attrs: Record<string, any> = {}): NodeBase {
  const id = makeId(type, name || type.toUpperCase());
  const now = Date.now();
  const base: NodeBase = {
    id,
    name: name || type.toUpperCase(),
    type,
    attrs,
    createdAt: now,
    updatedAt: now,
    ranking: { recency: 100, frequency: 1, completeness: 10, trust: 50, score: 0 },
  };
  base.ranking.score = rankScore(base.ranking);
  return base;
}

function touchNode(n: NodeBase, delta: Partial<NodeBase["ranking"]> = {}) {
  n.updatedAt = Date.now();
  n.ranking = { ...n.ranking, recency: 100, frequency: Math.min(100, n.ranking.frequency + 3), ...delta };
  n.ranking.score = rankScore(n.ranking);
}

// --------------------------- Memory & Glossary --------------------------- //

type GlossaryItem = { key: string; description: string; entity?: "org" | "team" | "user" | "artist" | "ip"; calc?: string };

const DEFAULT_GLOSSARY: GlossaryItem[] = [
  { key: "Reach", description: "Unique users reached by content or ads over a period", entity: "artist" },
  { key: "Frequency", description: "Avg. impressions per user", entity: "artist" },
  { key: "Streams", description: "Total streams across DSPs; counted per platform rules", entity: "artist" },
  { key: "Saves", description: "User saved track to library or playlist", entity: "ip" },
  { key: "CPS", description: "Cost per incremental stream (modeled)", calc: "AdSpend / IncrementalStreams" },
];

// --------------------------- Predictive Helpers --------------------------- //

function predictTeamName(domain?: Domain) {
  if (!domain) return "Digital Marketing";
  if (domain === "Label") return "Label Digital";
  if (domain === "Distributor") return "Partner Marketing";
  if (domain === "Management") return "Artist Management";
  return "Growth";
}

function predictConnectors(domain?: Domain): string[] {
  const keys: string[] = [];
  if (domain === "Label" || domain === "Distributor") keys.push("spotify", "apple_music", "youtube", "tiktok", "meta");
  if (domain === "Management") keys.push("tiktok", "instagram", "youtube");
  keys.push("gsuite", "crm_salesforce");
  return Array.from(new Set(keys));
}

function predictArtistRoster(orgName: string, teamName: string) {
  const seeds: string[] = [];
  if (/atlantic|warner|atl/i.test(orgName + teamName)) seeds.push("Ed Sheeran", "Dua Lipa");
  if (/rhino|catalog/i.test(orgName + teamName)) seeds.push("Fleetwood Mac", "Prince");
  if (!seeds.length) seeds.push("Your Top Artist", "Emerging Priority");
  return seeds.map(a => ({ name: a, id: makeId("artist", a), attrs: { priority: "TBD" } }));
}

// --------------------------- Conversational Co-Pilot --------------------------- //

type ChatMsg = { role: "copilot" | "user"; text: string; pill?: string };

function useCopilot(script: (state: any) => string) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const say = (text: string, pill?: string) => setMsgs(m => [...m, { role: "copilot", text, pill }]);
  const hear = (text: string) => setMsgs(m => [...m, { role: "user", text }]);
  const reset = () => setMsgs([]);
  return { msgs, say, hear, reset, script };
}

// --------------------------- Shared UI --------------------------- //

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>{label}</span>
        {tip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-help">?</Badge>
              </TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

function Pills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}
    </div>
  );
}

function Why({ fieldKey }: { fieldKey: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" className="h-7 px-2">why?</Button>
        </TooltipTrigger>
        <TooltipContent>Open the Activity tab to see signals touching “{fieldKey}”.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// --------------------------- Main Component --------------------------- //

type StepKey = "org" | "team" | "user" | "connectors" | "semantic" | "artists" | "review";

type Evidence = { id: string; when: number; source: "oauth" | "web" | "internal" | "heuristic"; signal: string; confidence: number; action: string; fields: string[] };

export default function WavoOnboardingMVP() {
  const [step, setStep] = useState<StepKey>("org");
  const [graph, setGraph] = useState<ContextGraph>({ nodes: {}, edges: [] });
  const [glossary, setGlossary] = useState<GlossaryItem[]>(DEFAULT_GLOSSARY);
  const [memory, setMemory] = useState<Record<string, any>>({});
  const [deferredConnect, setDeferredConnect] = useState<boolean>(true);

  // Explainability & provenance (dummy data)
  const [explainOn, setExplainOn] = useState<boolean>(true);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const pushEvidence = (e: Omit<Evidence, "id" | "when">) => setEvidence(arr => [...arr, { id: makeId("ev", e.signal), when: Date.now(), ...e }]);

  // Form state
  const [org, setOrg] = useState<{ name: string; license?: License; country?: string; domain?: Domain }>({ name: "" });
  const [team, setTeam] = useState<{ name: string; dept?: Dept; kpis?: string }>({ name: "" });
  const [user, setUser] = useState<{ name: string; email?: string; personalLicense?: License; title?: string; projects?: string }>({ name: "" });
  const [connect, setConnect] = useState<Record<string, boolean>>({});
  const [naming, setNaming] = useState<{ org?: string; team?: string; user?: string; artist?: string; ip?: string; project?: string }>({});
  const [artists, setArtists] = useState<Array<{ id: string; name: string; attrs: any }>>([]);

  // Co-pilot guidance
  const copilot = useCopilot(() => {
    const missingOrg = !org.name || !org.license || !org.domain;
    const missingTeam = !team.name || !team.dept;
    const missingUser = !user.name || !user.email || !user.title;

    if (step === "org") return missingOrg ? "Let's anchor your org. What's the organization name and license?" : "Looks good. Jump to Team when ready.";
    if (step === "team") return missingTeam ? "Who are you with? Team name and department is enough for now." : "Great. Next: your user profile.";
    if (step === "user") return missingUser ? "Give me your name, email, and role so I can personalize everything." : "Dial in connectors next. You can skip and defer if needed.";
    if (step === "connectors") return "I preselected common connectors for your domain. Toggle what applies or defer.";
    if (step === "semantic") return "Set naming conventions + a starter glossary. Keep it lightweight—this unlocks clean joins.";
    if (step === "artists") return "Add the artists you work with. I suggested a few; edit freely. I'll enrich from the music graph.";
    if (step === "review") return "You're set. Save & seed your workspace. I'll continue enriching in the background as you work.";
    return "Let's go.";
  });

  // Initial nudge & predictive fills (simulate prior knowledge)
  useEffect(() => {
    copilot.say("Welcome to Wavo. I’ll get you to value in minutes. Skips are safe; I’ll fill gaps as you go.", "Skip-friendly");
    pushEvidence({ source: "oauth", signal: "google.verified_email", confidence: 0.98, action: "prefill:user.email", fields: ["user.email"] });
    pushEvidence({ source: "web", signal: "linkedin.title=Director, Digital Marketing", confidence: 0.74, action: "suggest:user.title", fields: ["user.title"] });
    pushEvidence({ source: "internal", signal: "wavo.customer_domain=warner.com", confidence: 0.85, action: "suggest:org.domain=Label", fields: ["org.domain"] });
  }, []);

  useEffect(() => {
    if (org.domain && !team.name) {
      const guess = predictTeamName(org.domain!);
      setTeam(t => ({ ...t, name: guess }));
      pushEvidence({ source: "heuristic", signal: `predictTeamName(${org.domain})`, confidence: 0.6, action: `autofill:team.name=${guess}`, fields: ["team.name"] });
    }
    if (org.domain && Object.keys(connect).length === 0) {
      const picks = predictConnectors(org.domain);
      const map: Record<string, boolean> = {};
      picks.forEach(k => (map[k] = true));
      setConnect(map);
      pushEvidence({ source: "heuristic", signal: `predictConnectors(${org.domain})`, confidence: 0.65, action: `preselect:${picks.join(',')}`, fields: picks.map(k => `connect.${k}`) });
    }
  }, [org.domain]);

  useEffect(() => {
    if (step === "artists" && artists.length === 0 && org.name) {
      const seeds = predictArtistRoster(org.name, team.name);
      setArtists(seeds);
      pushEvidence({ source: "web", signal: `public_music_graph:${slug(org.name)}`, confidence: 0.55, action: `seed:artists=${seeds.map(a=>a.name).join(',')}`, fields: seeds.map(a => `artist.${a.name}`) });
    }
  }, [step]);

  function seedMemory() {
    const snapshot = {
      org, team, user,
      connectors: Object.keys(connect).filter(k => connect[k]),
      naming, artists, glossary, graph, deferredConnect,
      seededAt: new Date().toISOString(), evidence,
    };
    setMemory(snapshot);
  }

  function enrichTick() {
    const liveConnectors = Object.keys(connect).filter(k => connect[k]);
    setGraph(g => {
      const nodes = { ...g.nodes };
      Object.values(nodes).forEach(n => {
        const hasData = liveConnectors.length > 0;
        const delta = {
          completeness: Math.min(100, n.ranking.completeness + (hasData ? 2 : 0)),
          trust: Math.min(100, n.ranking.trust + (hasData ? 1 : 0)),
          recency: Math.min(100, 80),
        };
        touchNode(n, delta);
      });
      return { ...g, nodes };
    });
    pushEvidence({ source: "internal", signal: `connector.health=${liveConnectors.length}`, confidence: 0.9, action: "rank.update:trust+completeness", fields: ["graph.nodes.*.ranking"] });
  }

  function finalize() {
    const orgNode = newNode("org", naming.org || org.name || "Your Organization");
    orgNode.attrs = { license: org.license, country: org.country, domain: org.domain };

    const teamNode = newNode("team", naming.team || team.name || "Team");
    teamNode.attrs = { dept: team.dept, kpis: team.kpis };

    const userNode = newNode("user", naming.user || user.name || "User");
    userNode.attrs = { email: user.email, title: user.title, personalLicense: user.personalLicense };

    const artistNodes = artists.map(a => ({ ...newNode("artist", naming.artist ? `${naming.artist}:${a.name}` : a.name, a.attrs) }));

    const nodes = [orgNode, teamNode, userNode, ...artistNodes];
    const g0: ContextGraph = { nodes: {}, edges: [] };
    nodes.forEach(n => (g0.nodes[n.id] = n));
    g0.edges.push({ from: orgNode.id, to: teamNode.id, rel: "HAS_TEAM" });
    g0.edges.push({ from: teamNode.id, to: userNode.id, rel: "HAS_USER" });
    artistNodes.forEach(a => g0.edges.push({ from: teamNode.id, to: a.id, rel: "WORKS_ON" }));
    setGraph(g0);

    seedMemory();
    setStep("review");
    copilot.say("Nice. I seeded your workspace. I’ll keep enriching as data flows in.", "Personalized");
  }

  function downloadJSON(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const completion = useMemo(() => {
    const fields: boolean[] = [
      !!org.name, !!org.license, !!org.domain,
      !!team.name, !!team.dept,
      !!user.name, !!user.email, !!user.title,
      glossary.length > 0,
      artists.length > 0,
    ];
    const pct = Math.round(100 * fields.filter(Boolean).length / fields.length);
    return pct;
  }, [org, team, user, glossary, artists]);

  function StepNav({ k, label, done }: { k: StepKey; label: string; done?: boolean }) {
    const active = step === k;
    return (
      <Button variant={active ? "default" : "ghost"} onClick={() => setStep(k)} className="justify-between w-full text-left">
        <span className="flex items-center gap-2">{label}{done && <CheckCircle2 className="w-4 h-4 ml-2" />}</span>
        <ChevronRight className="w-4 h-4 opacity-60" />
      </Button>
    );
  }

  const RightPanel = (
    <Card className="h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5" />
          <div className="font-semibold">Co-Pilot</div>
          <Badge variant="secondary">Context-aware</Badge>
          <div className="ml-auto text-xs flex items-center gap-2">
            <Checkbox id="explain" checked={explainOn} onCheckedChange={() => setExplainOn(!explainOn)} />
            <label htmlFor="explain" className="cursor-pointer">Show my work</label>
          </div>
        </div>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="self-start">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1">
            <div className="flex-1 space-y-3 overflow-auto pr-1">
              {copilot.msgs.map((m, idx) => (
                <div key={idx} className={`rounded-2xl p-3 shadow ${m.role === "copilot" ? "bg-gray-50" : "bg-black text-white ml-8"}`}>
                  <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                  {m.pill && <div className="mt-2"><Badge>{m.pill}</Badge></div>}
                </div>
              ))}
              <div className="text-sm text-gray-700">{copilot.script({ org, team, user, step })}</div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => copilot.say(copilot.script({ org, team, user, step }))}>Nudge</Button>
              <Button variant="ghost" onClick={() => { copilot.say("Skipping ahead. I’ll fill gaps as we go."); setStep(nextStep(step)); }}><SkipForward className="w-4 h-4 mr-2"/>Skip</Button>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1">
            <div className="space-y-2 overflow-auto pr-1">
              {evidence.slice().reverse().map(ev => (
                <div key={ev.id} className="rounded-xl border p-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{ev.source}</Badge>
                    <span className="font-medium">{ev.action}</span>
                    <span className="text-xs text-gray-500 ml-auto">{new Date(ev.when).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs mt-1">signal: <span className="font-mono">{ev.signal}</span></div>
                  <div className="text-xs mt-1">confidence: {(ev.confidence * 100).toFixed(0)}%</div>
                  <div className="text-xs mt-1">fields: {ev.fields.join(", ")}</div>
                </div>
              ))}
              {evidence.length === 0 && <div className="text-xs text-gray-500">No activity yet.</div>}
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => {
                pushEvidence({ source: "web", signal: "press.release:Artist Priority Campaign", confidence: 0.62, action: "suggest:artists+projects", fields: ["artists.*", "user.projects"] });
                copilot.say("Found signals suggesting two priority artists this quarter. Added to suggestions.", "Why: web evidence");
              }}>Simulate Deep Research</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6" />
          <div>
            <div className="text-xl font-semibold">Wavo Onboarding</div>
            <div className="text-sm text-gray-700">Backbone for your data graph, IP graph, assistants, and analytics.</div>
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Settings2 className="w-4 h-4" />
              <div className="text-sm font-medium">Progress</div>
              <div className="ml-auto text-xs text-gray-700">{completion}% complete</div>
            </div>
            <Progress value={completion} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 space-y-2">
            <StepNav k="org" label="Step 1 — Organization" done={!!org.name && !!org.license && !!org.domain} />
            <StepNav k="team" label="Step 2 — Team" done={!!team.name && !!team.dept} />
            <StepNav k="user" label="Step 3 — User" done={!!user.name && !!user.email && !!user.title} />
            <StepNav k="connectors" label="Step 4 — Data Sources" done={Object.keys(connect).some(k => connect[k]) || deferredConnect} />
            <StepNav k="semantic" label="Step 5 — Semantic Layer & IDs" done={!!(naming.org && naming.team && naming.user)} />
            <StepNav k="artists" label="Step 6 — Artist Roster" done={artists.length > 0} />
            <StepNav k="review" label="Review & Seed" done={step === "review"} />
          </div>

          <div className="md:col-span-3 space-y-3">
            {step === "org" && <OrgStep org={org} setOrg={setOrg} />}
            {step === "team" && <TeamStep team={team} setTeam={setTeam} org={org} />}
            {step === "user" && <UserStep user={user} setUser={setUser} />}
            {step === "connectors" && <ConnectorsStep connect={connect} setConnect={setConnect} deferred={deferredConnect} setDeferred={setDeferredConnect} />}
            {step === "semantic" && <SemanticStep naming={naming} setNaming={setNaming} glossary={glossary} setGlossary={setGlossary} />}
            {step === "artists" && <ArtistsStep artists={artists} setArtists={setArtists} />}
            {step === "review" && <ReviewStep memory={memory} graph={graph} org={org} team={team} user={user} connectors={connect} glossary={glossary} artists={artists} onEnrich={enrichTick} onExport={() => downloadJSON("wavo-onboarding-seed.json", { memory, graph })} />}

            <div className="mt-2 flex gap-2">
              {step !== "review" && <Button onClick={() => setStep(nextStep(step))}><ArrowRight className="w-4 h-4 mr-2"/>Continue</Button>}
              {step !== "org" && step !== "review" && <Button variant="ghost" onClick={() => setStep(prevStep(step))}>Back</Button>}
              {step !== "review" && <Button variant="secondary" onClick={() => { finalize(); }}><UploadCloud className="w-4 h-4 mr-2"/>Seed Now</Button>}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">{RightPanel}</div>
    </div>
  );
}

// --------------------------- Step Components --------------------------- //

function OrgStep({ org, setOrg }: { org: any; setOrg: any }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Field label="Organization Name" tip="This anchors your org in the graph.">
          <div className="flex items-center gap-2">
            <Input placeholder="e.g., Atlantic Records" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            <Why fieldKey="org.name" />
          </div>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="License Type">
            <Select value={org.license} onValueChange={(v) => setOrg({ ...org, license: v as License })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{LICENSES.map(L => <SelectItem key={L} value={L}>{L}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Country / HQ">
            <Input placeholder="e.g., USA" value={org.country || ""} onChange={(e) => setOrg({ ...org, country: e.target.value })} />
          </Field>
        </div>
        <Field label="Primary Business Domain">
          <div className="flex items-center gap-2">
            <Select value={org.domain} onValueChange={(v) => setOrg({ ...org, domain: v as Domain })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{DOMAINS.map(D => <SelectItem key={D} value={D}>{D}</SelectItem>)}</SelectContent>
            </Select>
            <Why fieldKey="org.domain" />
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

function TeamStep({ team, setTeam, org }: { team: any; setTeam: any; org: any }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Field label="Team Name" tip="This nests under your organization.">
          <div className="flex items-center gap-2">
            <Input placeholder="e.g., Rhino Catalog Marketing" value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} />
            <Why fieldKey="team.name" />
          </div>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Department Function">
            <Select value={team.dept} onValueChange={(v) => setTeam({ ...team, dept: v as Dept })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map(D => <SelectItem key={D} value={D}>{D}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Team Goals / KPIs (optional)">
            <Input placeholder="e.g., Grow catalog streams 15%" value={team.kpis || ""} onChange={(e) => setTeam({ ...team, kpis: e.target.value })} />
          </Field>
        </div>
        {org?.domain && (
          <div className="text-xs text-gray-500">Suggested by domain ({org.domain}): team name prefilled, connectors will be recommended next.</div>
        )}
      </CardContent>
    </Card>
  );
}

function UserStep({ user, setUser }: { user: any; setUser: any }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Full Name">
            <Input placeholder="e.g., Alex Chen" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
          </Field>
          <Field label="Contact Email">
            <Input type="email" placeholder="e.g., alex@label.com" value={user.email || ""} onChange={(e) => setUser({ ...user, email: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Job Title / Function">
            <Input placeholder="e.g., Director, Digital Marketing" value={user.title || ""} onChange={(e) => setUser({ ...user, title: e.target.value })} />
          </Field>
          <Field label="Personal License Type">
            <Select value={user.personalLicense} onValueChange={(v) => setUser({ ...user, personalLicense: v as License })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{LICENSES.map(L => <SelectItem key={L} value={L}>{L}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Primary Artists / Projects (comma-sep)">
          <Textarea placeholder="e.g., Artist A, Artist B" value={user.projects || ""} onChange={(e) => setUser({ ...user, projects: e.target.value })} />
        </Field>
      </CardContent>
    </Card>
  );
}

function ConnectorsStep({ connect, setConnect, deferred, setDeferred }: { connect: Record<string, boolean>; setConnect: any; deferred: boolean; setDeferred: any }) {
  function toggle(key: string) { setConnect((m: any) => ({ ...m, [key]: !m[key] })); }
  const selected = Object.keys(connect).filter(k => connect[k]);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="font-medium">Data Sources & Connectors</div>
          <Badge variant="secondary">Quick-connect</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CONNECTORS.map(c => (
            <label key={c.key} className={`flex items-center gap-2 rounded-xl border p-2 cursor-pointer ${connect[c.key] ? "bg-gray-50" : ""}`}>
              <Checkbox checked={!!connect[c.key]} onCheckedChange={() => toggle(c.key)} />
              <div className="text-sm">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">{c.category}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={deferred} onCheckedChange={() => setDeferred(!deferred)} />
          <div className="text-sm">Defer connecting for now (recommended)</div>
          <div className="ml-auto text-xs text-gray-500">Preselected: {selected.length || 0}</div>
        </div>
        <div className="text-xs text-gray-500">You can start working immediately. I’ll backfill once connections are live.</div>
      </CardContent>
    </Card>
  );
}

function SemanticStep({ naming, setNaming, glossary, setGlossary }: { naming: any; setNaming: any; glossary: GlossaryItem[]; setGlossary: any }) {
  const [gKey, setGKey] = useState("");
  const [gDesc, setGDesc] = useState("");
  function addGlossary() {
    if (!gKey) return;
    setGlossary((arr: GlossaryItem[]) => [...arr, { key: gKey, description: gDesc }]);
    setGKey(""); setGDesc("");
  }
  return (
    <Tabs defaultValue="naming">
      <TabsList>
        <TabsTrigger value="naming">Naming & IDs</TabsTrigger>
        <TabsTrigger value="glossary">Glossary</TabsTrigger>
      </TabsList>
      <TabsContent value="naming">
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Org Naming Convention" tip="e.g., ORG: {Company}">
              <Input placeholder="e.g., ORG:{Company}" value={naming.org || ""} onChange={(e) => setNaming({ ...naming, org: e.target.value })} />
            </Field>
            <Field label="Team Naming Convention" tip="e.g., TEAM: {Dept}-{Market}">
              <Input placeholder="e.g., TEAM:{Dept}-{Market}" value={naming.team || ""} onChange={(e) => setNaming({ ...naming, team: e.target.value })} />
            </Field>
            <Field label="User Naming Convention" tip="e.g., USER:{First}.{Last}">
              <Input placeholder="e.g., USER:{First}.{Last}" value={naming.user || ""} onChange={(e) => setNaming({ ...naming, user: e.target.value })} />
            </Field>
            <Field label="Artist Naming Convention" tip="e.g., ART:{Artist}">
              <Input placeholder="e.g., ART:{Artist}" value={naming.artist || ""} onChange={(e) => setNaming({ ...naming, artist: e.target.value })} />
            </Field>
            <Field label="IP Naming Convention" tip="e.g., IP:{Title}-{ISRC}">
              <Input placeholder="e.g., IP:{Title}-{ISRC}" value={naming.ip || ""} onChange={(e) => setNaming({ ...naming, ip: e.target.value })} />
            </Field>
            <Field label="Project Naming Convention" tip="e.g., PRJ:{Artist}-{Campaign}-{Region}">
              <Input placeholder="e.g., PRJ:{Artist}-{Campaign}-{Region}" value={naming.project || ""} onChange={(e) => setNaming({ ...naming, project: e.target.value })} />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="glossary">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-sm text-gray-700">Seed a lightweight metrics/dimensions glossary. Keep names stable; descriptions can evolve.</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {glossary.map((g) => (
                <div key={g.key} className="rounded-xl border p-2">
                  <div className="text-sm font-medium">{g.key}</div>
                  <div className="text-xs text-gray-500">{g.description}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <Field label="Name"><Input value={gKey} onChange={(e) => setGKey(e.target.value)} placeholder="e.g., CPS" /></Field>
              <Field label="Description"><Input value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="e.g., Cost per incremental stream" /></Field>
              <Button onClick={addGlossary}><ArrowRight className="w-4 h-4 mr-2"/>Add</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function ArtistsStep({ artists, setArtists }: { artists: any[]; setArtists: any }) {
  const [name, setName] = useState("");
  function add() {
    if (!name) return; setArtists((a: any[]) => [...a, { id: makeId("artist", name), name, attrs: {} }]); setName("");
  }
  function remove(id: string) { setArtists((a: any[]) => a.filter(x => x.id !== id)); }
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="text-sm text-gray-700">Add artists you work with. I’ll enrich with public + Wavo graph data.</div>
        <div className="flex gap-2">
          <Input placeholder="Artist name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={add}><ArrowRight className="w-4 h-4 mr-2"/>Add</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {artists.map(a => (
            <div key={a.id} className="rounded-xl border p-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-gray-500">{a.id}</div>
              </div>
              <Button variant="ghost" onClick={() => remove(a.id)}>Remove</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewStep({ memory, graph, org, team, user, connectors, glossary, artists, onEnrich, onExport }: any) {
  const connected = Object.keys(connectors).filter((k) => connectors[k]);
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <div className="font-medium">Ready to Roll</div>
          <Badge variant="secondary">Seeded</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SummaryBox title="Organization" items={[org.name, `${org.domain || ""} • ${org.license || ""}`].filter(Boolean)} />
          <SummaryBox title="Team" items={[team.name, team.dept, team.kpis].filter(Boolean)} />
          <SummaryBox title="User" items={[user.name, user.title, user.email].filter(Boolean)} />
          <SummaryBox title="Connectors" items={connected.length ? connected : ["Deferred"]} />
          <SummaryBox title="Artists" items={artists.map((a: any) => a.name)} />
          <SummaryBox title="Glossary" items={glossary.slice(0, 5).map((g: any) => `${g.key}`)} />
        </div>
        <div className="text-xs text-gray-500">I’ll personalize assistants, agents, and dashboards from this snapshot and keep learning from usage.</div>
        <div className="flex gap-2">
          <Button onClick={onEnrich}><CalendarClock className="w-4 h-4 mr-2"/>Simulate Enrichment Tick</Button>
          <Button variant="secondary" onClick={onExport}><Download className="w-4 h-4 mr-2"/>Export Seed JSON</Button>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify({ memory, graph }, null, 2)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm font-semibold mb-1">{title}</div>
      <Pills items={items} />
    </div>
  );
}

// --------------------------- Step Helpers --------------------------- //

function nextStep(s: StepKey): StepKey {
  const order: StepKey[] = ["org", "team", "user", "connectors", "semantic", "artists", "review"];
  const i = order.indexOf(s);
  return order[Math.min(order.length - 1, i + 1)];
}

function prevStep(s: StepKey): StepKey {
  const order: StepKey[] = ["org", "team", "user", "connectors", "semantic", "artists", "review"];
  const i = order.indexOf(s);
  return order[Math.max(0, i - 1)];
}
