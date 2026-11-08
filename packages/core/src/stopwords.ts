/** A compact English stop-word list used for keyword weighting (not for meaning). */
export const STOPWORDS: ReadonlySet<string> = new Set(
  `a about above after again against all also am an and any are aren't as at be because been before being below
between both but by can cannot could couldn't did didn't do does doesn't doing don't down during each few for from
further get gets got had hadn't has hasn't have haven't having he her here hers herself him himself his how i if in
into is isn't it it's its itself just let's like made make makes many me might more most much must my myself no nor
not now of off often on once one only or other ought our ours ourselves out over own per quite rather really said same
she should shouldn't so some such than that that's the their theirs them themselves then there there's these they
they're this those through to too under until up upon us use used very was wasn't we were weren't what when where
which while who whom why will with within without won't would wouldn't yet you your yours yourself yourselves
thing things way ways also around even ever every get getting go goes going gone just keep kept let lot lots may
maybe much need needs new old put puts see seen take takes taken tell tells told two three first second well
`
    .split(/\s+/)
    .filter(Boolean),
);

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token.toLowerCase());
}
