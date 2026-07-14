---
title: Be Careful What You Wish For
date: 2026-07-12
author: Alexis Brignoni
tags: [AI, LLM, DFIR, opinion]
excerpt: The genie can grant almost anything. It cannot grant you judgment. And judgment is the one thing you need in order to control it.
---

# Be Careful What You Wish For

*The genie can grant almost anything. It cannot grant you judgment. And judgment is the one thing you need in order to control it.*

![A brass genie lamp sealed inside a digital evidence bag with a chain-of-custody label reading "grants wishes, unverified"](https://cdn.jsdelivr.net/gh/abrignoni/leapps-website@main/blog/images/2026-07-12-be-careful-what-you-wish-for/lamp-evidence.png)

We are implementing AI in digital forensics wrong.

Here is a new technology that works like a genie. You make a wish. The genie provides. What is not to like?

Need a timeline? Don't bother collecting sources or extracting data. Ask the genie. Have a data source you don't understand? Ask the genie. It comes back parsed. What is not to like?

## The wish machine

Look at what most tools are actually doing. They take reports generated after processing, tokenize them, and make them queryable through an LLM.

Let's be honest about what that is. It is expensive text search. It is not revolutionary.

That doesn't make it useless. A glorified Google over your case data still helps. I won't deny it. But is that the best we can do with this technology? All the wishes you can want, assuming you can pay for them?

A tool does not fix a broken process. It accelerates the process you already have.

If you have a backlog, the genie will not make it disappear. You will build backlog faster. If you don't do analysis, the genie will not do it for you. What it will do is hand you something that looks right and sounds right, right up until it isn't, at the worst possible moment.

The problem is not the AI. The problem is the belief that AI will do what you don't understand, and that this will somehow produce better outcomes. It will not.

## Claudenoni

For the last few weeks I have been using Claude extensively on the LEAPPs codebase. An inside joke came out of it. When Claude-assisted code shows up in the repos, we say Claudenoni did it.

The joke is funny because of the *noni*. The human element is the point. It is not optional and it is not decoration.

Domain knowledge is what makes code work. You cannot work on a function you do not understand. You can try. It will not go well.

With domain knowledge, you spot problems before the code ever executes. You predict the results of an action. You look at output and know whether it is appropriate for the work being done.

Where does domain knowledge come from? A baseline, first. In coding that means variables, data types, control flow, loops. Then it becomes real by doing the work. By writing the code.

LLMs do not shortcut that. You need the basics in place so you can read the output. You need them so you know what to ask. Most importantly, you need them so you can tell when the genie is lying to you, or when it is simply wrong.

Domain knowledge is what gives you control over the genie. It is what keeps you from getting monkey-pawed.

If you don't know the story: a monkey's paw grants your wish and attaches a consequence you never saw coming. Ask for riches. You inherit them from the aunt you loved most, who had to die to make the wish come true. Ask for fame. Pay for it with loneliness.

## Judgment

I reviewed every PR. Every one.

Many times I had to tell the model not to do X or Y because it was breaking conventions the codebase depends on. Without domain knowledge I would not have caught it. I would have shipped something that looked good, and the consequences would have found me later. They always do.

So what was the process? I led with domain knowledge and I verified results. Step by step, I taught the genie how to grant wishes well. And I still check every single time, because this genie forgets things constantly. Context window management is its own interesting problem.

There is a shorter word for domain knowledge. Judgment.

Judgment comes from a solid foundation and from experience. Those are the two things the genie cannot grant you. They are also the two things you need in order to control it.

## What we owe

I have met examiners who are proud of button pushing. Dump the data. Pump out a report. Done. What else could possibly be needed?

I have seen management treat closing a case fast as more important than investigating it fully, even when a full investigation is what produces the right sentencing outcome.

Put a genie in that environment and you know exactly what you get. Mediocrity at the speed of light.

We owe our stakeholders more. We owe victims more. We owe suspects more. We owe ourselves more.

This technology can make our work better. It can also do enormous damage in the hands of people who never built the expertise to check it. Handing a powerful tool to someone with no training and no judgment is not innovation. It is negligence with a nicer interface.

AI belongs in the hands of practitioners who know what to ask and know how to verify the answer.

The moral of the story hasn't changed in a hundred years.

Be careful what you wish for.
