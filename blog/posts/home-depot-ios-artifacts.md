---
title: Getting It Done with Home Depot iOS Artifacts
date: 2026-06-29
author: James Habben
tags: [iLEAPP, iOS, artifacts, Home Depot, research]
excerpt: A look at new iLEAPP parsing for the Home Depot iOS app, including account details, store preferences, searches, viewed products, shopping lists, cached location, and a few useful cache artifacts.
---

# Getting It Done with Home Depot iOS Artifacts

This one started like many others: I had an iOS extraction with the Home Depot app and wanted to know what it was keeping in the shed.

Retail apps can be very interesting or very dull. Sometimes an app is mostly a WebKit wrapper around the company website, and there is not much local data to work with. Other times the app has enough native features, caches, preferences, and feedback loops that it leaves behind a much richer trail.

That trail can matter in a few different ways. There are the obvious indicators: did someone search for or view a product that lines up with the facts of a case? If vandalism involved a specific kind of paint, did that kind of paint show up in search or product history?

Then there is the quieter pattern-of-life side. Searches and product views can help show app activity around a timeframe. Store preferences can point to a familiar area. A cached location can provide context, with the usual caution that cached app data needs careful interpretation.

So I put on my safety glasses and started digging into the Home Depot app.

## Do It Yourself

One of the great things about the LEAPPs tools is that anyone can do a little research and put together a parser to extract the data. DIY, if you will. We don't have to hope for support and wait for the next release cycle.

The latest iLEAPP work adds a new module:

```text
scripts/artifacts/home_depot.py
```

The artifacts live under a new **Home Depot** category. This first pass adds several outputs from the app's preferences plist and Core Data store. It is a little DIY, a little aisle-wandering, and hopefully a useful new drawer in the iLEAPP toolbox.

![iLEAPP finish screen showing Home Depot artifact record counts](https://cdn.jsdelivr.net/gh/abrignoni/leapps-website@main/blog/images/home-depot-ios-artifacts/ileapp-home-depot.png)
*Figure 1: iLEAPP finish screen showing Home Depot artifact record counts*

## The two main data sources

The parser started with two main Home Depot app files:

```text
Library/Preferences/com.thehomedepot.homedepot.plist
Documents/THDConsumer.sqlite
```

The preferences plist holds account, store, location, saved-search, URL-cache, image-cache, and general preference data.

The SQLite database is a Core Data store. Several useful values inside it are not plain strings sitting politely in table columns. They are archived blobs, so the parser uses `nska_deserialize` support to pull out the underlying objects.

Because these are app container and App Group files, this artifact can be useful in logical (iTunes-style) extractions. That includes data collected with tools like [UFADE](https://github.com/prosch88/UFADE), which is a nice fit for anyone doing open source iOS acquisition and analysis work.

For account data, there are a couple more boards in the pile. The module also checks App Group data when present:

```text
Shared/AppGroup/*/Library/Preferences/group.com.thehomedepot.homedepot.plist
Shared/AppGroup/*/userInfo.txt
```

Those can hold shared account information outside the app container itself. In the output, the account artifact includes a source column so you can see whether a row came from `USER_INFO_KEY`, `SharedUserInfoKey`, or `userInfo.txt`.

That split is common in iOS app research: one file gives you the obvious settings, and another gives you the cached app state that starts making the app feel alive. Measure twice, parse once.

## What the module reports

The first version adds these Home Depot artifacts:

- **Home Depot - Account & Store**
- **Home Depot - Saved Searches**
- **Home Depot - Search History**
- **Home Depot - Products Viewed**
- **Home Depot - Shopping Lists**
- **Home Depot - Last Known Location**
- **Home Depot - Product Image Cache**
- **Home Depot - Search URL Cache**
- **Home Depot - Other Preferences**

That is a pretty wide first pass. Some of it is user-facing activity, some of it is cached app behavior, and some of it is context that helps explain what the app was doing.

## Account and store details

The account artifact parses account data from up to three places: `USER_INFO_KEY` in the app preferences plist, `SharedUserInfoKey` in the App Group preferences plist, and `userInfo.txt` in the App Group container. That can include account identity information, email address, name, phone number, customer type, ZIP code, customer account ID, and local store details.

The store side can include store name, address, phone number, and coordinates. Preferred store IDs can also come from `savedStorePreference` in the app preferences.

This artifact can contain PII, so it should be handled with the same care as any other account or profile artifact. It is useful, but it is not subtle. Bright orange bucket, right in the middle of the aisle.

![LAVA table showing Home Depot account and store artifact output](https://cdn.jsdelivr.net/gh/abrignoni/leapps-website@main/blog/images/home-depot-ios-artifacts/lava-home-depot-account.png)
*Figure 2: Account and store details shown in LAVA*

## Searches, products, and shopping lists

The module looks at search activity from two angles.

Saved searches come from the preferences plist, including saved search terms and associated dates when available. Search history comes from the `THDConsumer.sqlite` Core Data store and includes the accessed date, search term, and history type.

Products viewed are also parsed from the Core Data store. Those cached product objects can include item ID, product label, brand, model number, store SKU, price, product URL, and image URL.

Shopping list items are included too. The first version keeps the shopping list details fairly broad by returning the local item ID and serialized details. That gives us the evidence without pretending every nested object is fully understood yet. Sometimes the right tool for the job is a cautious first pass.

![LAVA table showing Home Depot search history artifact output](https://cdn.jsdelivr.net/gh/abrignoni/leapps-website@main/blog/images/home-depot-ios-artifacts/lava-home-depot-search.png)
*Figure 3: Home Depot search history shown in LAVA*

## Last known location

The Home Depot app preferences can contain a `currentLocationKey` value. In the samples behind this parser, that value was an archived `CLLocation` blob.

The artifact reports:

- Timestamp
- Latitude
- Longitude
- Horizontal accuracy
- Altitude

There is still room to wire this into KML-style output later, but even as a table artifact it is useful context. It tells you what location the app had cached, not necessarily why it had it or whether it represents a visit to a store.

That distinction matters. A cached app location is evidence, but it needs to be interpreted carefully. No one wants to build a whole case on a crooked shelf.

## Cache artifacts can be surprisingly chatty

Two of the smaller artifacts ended up being some of my favorite bits of this parser.

The **Product Image Cache** artifact looks for cached product image URLs and HTTP `Last-Modified` timestamps. That can help tie an image cache entry back to a product slug and a cache date.

The **Search URL Cache** artifact looks for cached `thdws.com` search API URLs. These can include search terms from keystroke chains, so the parser deduplicates them down to the more complete search strings when possible.


## A catch-all for the rest

The module also includes **Home Depot - Other Preferences**. It reports remaining preference keys that are not already handled by the focused artifacts, while excluding noisy SDK and analytics keys.

I like having this kind of artifact during early module work. It gives examiners and researchers a place to see what else may be worth future parsing without dumping every third-party SDK setting into the main results.

## The order history shelf is empty for now

The big one I was hoping for was order history.

The app shows previous orders, and that would obviously be a useful artifact: purchased items, dates, fulfillment or pickup details, store context, and maybe totals. I went looking for it expecting that to be one of the main wins.

In the samples I tested, I did not find order history stored locally in the app preferences, the App Group account files, or `THDConsumer.sqlite`. My current read is that the app is likely fetching that view from the account side when it needs it, rather than keeping a durable local order table.

## First pass, useful ground

This is an initial Home Depot parser, but it already covers several useful areas:

- Who the app account belonged to
- Which store was preferred or local
- What the user searched for
- Which products were cached as viewed
- What local shopping list data was present
- What location the app had cached
- What product images and search URLs were cached

As usual, the next round of samples will probably teach us where the weird edges are. That is part of the fun. Every app has its own habits, and a parser gets better when more people throw real-world data at it.
