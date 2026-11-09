/**
 * Plan wording shared by the resources, the prompts and the no-key error, so
 * the plan statement lives in one place. It mirrors the Visual Sentinel offer
 * as of PLANS_AS_OF in resources.ts; https://visualsentinel.com/pricing is
 * always current.
 *
 * API keys (and so the account tools) come with every paid plan. A trial of a
 * paid plan gets that plan's API access, with or without a card. A workspace
 * on the older Free plan, one that has not started a trial or subscription,
 * and one whose monitoring is paused cannot use its keys.
 */

/** Finishes "API keys come with ...". */
export const API_KEY_PLANS =
  'every paid plan (Solo, Starter, Business and Agency), including during the 10-day free trial';

/** The same, short, for parentheses and table cells. */
export const API_KEY_PLANS_SHORT = 'every paid plan, including the 10-day free trial';

export const NO_FREE_PLAN_SENTENCE = 'Sign-ups on the website have no Free plan.';

export const MONEY_BACK_SENTENCE = 'Every paid plan has a 30-day money-back guarantee from the first payment.';
