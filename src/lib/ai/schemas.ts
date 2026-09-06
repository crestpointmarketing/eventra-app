import { z } from 'zod'
const text = z.string().min(1)
const strings = z.array(z.string())
const score = z.number().min(0).max(100)
export const subjectLinesSchema = z.object({subjectLines:z.array(z.object({text:text.max(200),tone:text,approach:text}).passthrough()).min(1).max(5)})
export const recommendationSchema = z.object({shouldSend:z.enum(['yes','wait','no']),recommendedTemplates:z.array(z.object({templateId:z.uuid(),score,reasons:strings})).min(1).max(3),primaryRecommendation:z.uuid(),riskFlags:strings.default([])})
export const leadScoreSchema = z.object({ score, confidence: z.number().min(0).max(1), reasoning: text, strengths: strings, weaknesses: strings, recommendations: strings })
export const draftSchema = z.object({ subject: text.max(500), body: text.max(20000), variables: z.record(z.string(), z.string()).default({}), selectedCta: z.string().optional() })
export const summarySchema = z.object({ summary: text, key_talking_points: strings, key_signals: strings, product_fit: z.object({overallScore:score}).passthrough(), recommendations: z.array(z.object({action:text}).passthrough()) }).passthrough()
export const qualificationSchema = z.object({ fitScore: score, qualification:z.enum(['high','medium','low','not_qualified']), reasoning:text, painPoints:strings, opportunities:strings, risks:strings, recommendations:strings,
 industryMatch:z.object({score,reasoning:text,isTargetIndustry:z.boolean()}), companySizeMatch:z.object({score,reasoning:text,appropriateForProducts:z.boolean()}) })
export const complexitySchema = z.object({ estimatedDays:z.number().min(1).max(365), complexity:z.enum(['low','medium','high']), confidence:score, reasoning:text })
export const eventProfileSchema = z.object({ summary:text, recommendations:strings, targetAudience:z.object({demographics:strings,jobRoles:strings,interests:strings,companySize:strings}),
 suitableIndustries:z.array(z.object({industry:text,fitScore:score,reasoning:text})), budgetBreakdown:z.record(z.string(),z.object({percentage:score,recommendation:text})),
 roiInsights:z.object({estimatedROI:text}).passthrough() }).passthrough()
