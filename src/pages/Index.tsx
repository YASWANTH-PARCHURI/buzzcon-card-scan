import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, LogOut, Sparkles, Target, Users, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type ValidatorInput = {
  ideaName: string;
  audience: string;
  problem: string;
  solution: string;
  moat: string;
  distribution: string;
  monetization: string;
};

const initialInput: ValidatorInput = {
  ideaName: '',
  audience: '',
  problem: '',
  solution: '',
  moat: '',
  distribution: '',
  monetization: '',
};

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const Index = () => {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<ValidatorInput>(initialInput);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const scoreCard = useMemo(() => {
    const audienceScore = Math.min(wordCount(form.audience) * 6, 20);
    const problemScore = Math.min(wordCount(form.problem) * 2.5, 20);
    const solutionScore = Math.min(wordCount(form.solution) * 2.5, 20);
    const distributionScore = Math.min(wordCount(form.distribution) * 2.5, 20);
    const businessScore = Math.min((wordCount(form.monetization) + wordCount(form.moat)) * 2.5, 20);

    const total = Math.round(audienceScore + problemScore + solutionScore + distributionScore + businessScore);

    const verdict = total >= 80
      ? 'Strong signal — this is ready for customer interviews this week.'
      : total >= 60
        ? 'Promising, but refine the weak sections before writing code.'
        : 'Early stage — sharpen the problem, user, and distribution first.';

    const risks = [
      wordCount(form.audience) < 8 && 'Audience is too broad. Name one exact user segment.',
      wordCount(form.problem) < 15 && 'Problem statement needs real-world pain and urgency.',
      wordCount(form.distribution) < 12 && 'Distribution is unclear. Explain first 100 users channel.',
      wordCount(form.monetization) < 10 && 'Monetization is thin. Define price point + billing model.',
    ].filter(Boolean) as string[];

    return {
      total,
      verdict,
      dimensions: [
        { label: 'Audience clarity', value: Math.round(audienceScore) },
        { label: 'Problem severity', value: Math.round(problemScore) },
        { label: 'Solution sharpness', value: Math.round(solutionScore) },
        { label: 'Go-to-market', value: Math.round(distributionScore) },
        { label: 'Business durability', value: Math.round(businessScore) },
      ],
      risks,
    };
  }, [form]);

  const updateField = (field: keyof ValidatorInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Lightbulb className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Startup Idea Validator</h1>
                <p className="text-sm text-muted-foreground">Vibe-code your concept, then pressure-test it.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Idea Brief</CardTitle>
            <CardDescription>Fill this out quickly. Specific beats polished.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ideaName">Startup name</Label>
                <Input id="ideaName" value={form.ideaName} onChange={(e) => updateField('ideaName', e.target.value)} placeholder="e.g. SignalFlow AI" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Who is this for?</Label>
                <Textarea id="audience" value={form.audience} onChange={(e) => updateField('audience', e.target.value)} placeholder="Name one primary user and where they already spend time." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="problem">What painful problem do they have?</Label>
                <Textarea id="problem" value={form.problem} onChange={(e) => updateField('problem', e.target.value)} placeholder="Describe frequency, cost, and current workaround." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution">Your solution in one workflow</Label>
                <Textarea id="solution" value={form.solution} onChange={(e) => updateField('solution', e.target.value)} placeholder="Explain how your product removes friction step-by-step." />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distribution">First 100 users plan</Label>
                  <Textarea id="distribution" value={form.distribution} onChange={(e) => updateField('distribution', e.target.value)} placeholder="Channel + outreach cadence + conversion expectation." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monetization">Monetization + moat</Label>
                  <Textarea id="monetization" value={form.monetization} onChange={(e) => updateField('monetization', e.target.value)} placeholder="Pricing model and why competitors cannot copy quickly." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="moat">Why now?</Label>
                <Textarea id="moat" value={form.moat} onChange={(e) => updateField('moat', e.target.value)} placeholder="What changed in tech, behavior, or regulation to make this possible now?" />
              </div>
              <Button type="submit" className="w-full h-11">
                <Sparkles className="h-4 w-4 mr-2" />
                Validate idea
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-fit sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Validation Score</CardTitle>
            <CardDescription>Simple heuristic score to force better thinking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall</span>
                <span className="text-3xl font-bold">{hasSubmitted ? scoreCard.total : 0}<span className="text-base font-normal text-muted-foreground">/100</span></span>
              </div>
              <Progress value={hasSubmitted ? scoreCard.total : 0} />
            </div>

            <p className="text-sm">{hasSubmitted ? scoreCard.verdict : 'Submit your brief to generate a validation readout.'}</p>

            <div className="space-y-3">
              {scoreCard.dimensions.map((dimension) => (
                <div key={dimension.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{dimension.label}</span>
                    <span>{hasSubmitted ? dimension.value : 0}/20</span>
                  </div>
                  <Progress value={hasSubmitted ? (dimension.value / 20) * 100 : 0} />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Biggest Gaps</h3>
              {hasSubmitted && scoreCard.risks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {scoreCard.risks.map((risk) => (
                    <Badge key={risk} variant="secondary" className="whitespace-normal text-left">{risk}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No major gaps detected yet.</p>
              )}
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Pro tip: run 5 interviews before building v1.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
