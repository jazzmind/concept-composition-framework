# Sundai 25 — An Intro to Concept Design for Coding
*Daniel Jackson · MIT EECS/CSAIL · Sundai Club · Aug 10, 2025*

---
## Table of Contents
- [an intro to](#an-intro-to)
- [how good are](#how-good-are)
- [a benchmark for realistic coding problems](#a-benchmark-for-realistic-coding-problems)
- [METR study (10 July 2025)](#metr-study-10-july-2025)
- [Developers qualitatively note LLM tooling performs worse in more complex](#developers-qualitatively-note-llm-tooling-performs-worse-in-more-complex)
- [might LLMs inspire](#might-llms-inspire)
- [LLMs expose deep flaws in how we build software](#llms-expose-deep-flaws-in-how-we-build-software)
- [incrementality & integrity](#incrementality-integrity)
- [transparency](#transparency)
- [RealWorld,](#realworld)
- [Slide](#slide)
- [Comment](#comment)
- [Comment](#comment)
- [User](#user)
- [concepts:](#concepts)
- [what’s a concept?](#what-s-a-concept)
- [concept Upvote [User, Item]](#concept-upvote-user-item)
- [concept Upvote](#concept-upvote)
- [how to ensure concepts are independent?](#how-to-ensure-concepts-are-independent)
- [concept](#concept)
- [concepts aren’t objects](#concepts-aren-t-objects)
- [Comment](#comment)
- [Tag](#tag)
- [a modularity](#a-modularity)
- [purpose shorter or more memorable way to link](#purpose-shorter-or-more-memorable-way-to-link)
- [user-provided short url sufﬁx](#user-provided-short-url-suf-x)
- [concept UrlShortening](#concept-urlshortening)
- [concept NonceGenerator [Context]](#concept-noncegenerator-context)
- [concept ExpiringResource [Resource]](#concept-expiringresource-resource)
- [concept WebAnalytics](#concept-webanalytics)
- [sync generateNonce](#sync-generatenonce)
- [sync lookupSync1](#sync-lookupsync1)
- [conclusions](#conclusions)
- [Slide 34](#slide-34)
- [better structure will amplify the benefits of advances in LLMs](#better-structure-will-amplify-the-benefits-of-advances-in-llms)
- [initial motivations](#initial-motivations)
- [paper appearing any day now](#paper-appearing-any-day-now)
---
## an intro to
Daniel Jackson · MIT EECS/CSAIL · Sundai Club · Aug 10, 2025 concept design for coding
## how good are
**LLMs at coding?**
## a benchmark for realistic coding problems
**2,294 issue/pull request pairs from 12 Python repos**
best LLM resolves 65% of issues follow-up study at York University
**33% of good patches “cheated”: code appears in issue**
**31% of patches deemed correct by incomplete tests**
**94% issues were present before training cutoff**
with all this, resolution rate for GPT-4 falls to 0.55% in short: LLM-based coding assistants often suggest code that doesn’t work and breaks existing functionality
## METR study (10 July 2025)
**Randomized control trial**
**16 developers on 246 tasks**
## Developers qualitatively note LLM tooling performs worse in more complex
environments. One developer says “it also made some weird changes in other parts of the code that cost me time to ﬁnd and remove [...] My feeling is the refactoring necessary for this PR was “too big” [and genAI] introduced as many errors as it ﬁxed.” Another developer comments that one prompt “failed to properly apply the edits and started editing random other parts of the ﬁle,” and that these failures seemed to be heavily related to “the size of a single ﬁle it is attempting to perform edits on”.
## might LLMs inspire
us to rethink software?
## LLMs expose deep flaws in how we build software
software is brittle, poorly organized & needlessly complex
**LLMs fail for the same reasons as human programmers**
some mistakes we make focus on code at expense of design underestimating cost of technical debt opportunity to rethink our approach better not only for LLMs but for humans too!
## incrementality & integrity
small changes are hard to make and risk breaking everything the problem
## transparency
clear where to ﬁnd something code corresponds to behavior modularity each feature in its own place changes don’t propagate the solution
## RealWorld,
a full-stack benchmark
## Slide

_(No extractable text on this slide)_
## Comment
routes
**Comment**
controller
**Comment**
model
**Tag**
routes
**Tag**
controller
**Tag**
model
**Article**
routes
**Article**
controller
**Article**
model
**User**
routes
**User**
controller
**User**
model routing layer encapsulates
**HTTP**
controller layer encapsulates business logic model layer encapsulates database storage
## Comment
routes
**Comment**
controller
**Comment**
model
**Tag**
routes
**Tag**
controller
**Tag**
model
**Article**
routes
**Article**
controller
**Article**
model
**User**
routes
**User**
controller
**User**
model modularity of services transparency each increment has a clear home
## User
**Article**
favorites many features involve >1 object eg, favorites relates Users to Articles
**Article**
**Comment**
addComment
**OOP encourages dependencies**
eg, addComment is method of Article
**User**
objects conﬂate features authentication, proﬁles, following are all in User
## concepts:
a new modularity
## what’s a concept?
a coherent unit of behavior user-facing (a behavioral pattern) a nano service (a backend API) reusable & familiar designed, coded and explained independently
## concept Upvote [User, Item]
state a set of Votes with a voter User a target Item actions upvote (u: User, i: Item) unvote (u: User, i: Item) purpose rank items by popularity principle after series of votes of items, the items can be ranked by their number of votes
**User**
target
**Vote**
**Item**
voter
## concept Upvote
purpose rank items by popularity principle after series of votes of items, the items can be ranked by their number of votes concept Reaction purpose send reactions to author principle when user selects reaction, it’s shown to the author (often in aggregated form) concept Recommendation purpose use prior likes to recommend principle user’s likes lead to ranking of kinds of items, determining which items are recommended
## how to ensure concepts are independent?
no calls from one to another no assumptions about external types sync NotifyAuthorOnUpvote when Upvote.upvote (item) where author of item is user in Post concept then Notiﬁcation.notify (user, item + “ upvoted”) suppose we want to notify authors when their posts are upvoted we have Upvote.upvote (…) and Notiﬁcation.notify (…) concept Upvote [User, Item] state a set of Votes with a voter User a target Item
## concept
spec concept code sync spec sync code front-end spec front-end code deployed app concept spec
**LLM**
prompt code
## concepts aren’t objects

_(No extractable text on this slide)_
## Comment
routes
**Comment**
controller
**Comment**
model
**Tag**
routes
**Tag**
controller
**Tag**
model
**Article**
routes
**Article**
controller
**Article**
model
**User**
routes
**User**
controller
**User**
model using a concept design lens, some problems become evident they don’t cover concepts that lack objects (eg, following, favoriting) each stack doesn’t fully encapsulate its functionality
## Tag
**Object**
**Tag**
**Concept**
functionality contained objects involved genericity of references modularity summary tag format, but not adding or deleting (which is in
**Article object)**
just tag objects none: reference to Tag in Article is explicit not really modular all functions associated with tags tags and items tagged fully polymorphic: tagged item can be any type fully modular & reusable
## a modularity
exercise
## purpose shorter or more memorable way to link
concept UrlShortening principle after create generates a short url, lookup will return the original url state a set of Shortenings with a targetUrl String a shortUrl String actions create (shortUrlBase, targetUrl: String): (shortUrl: String) pick any shortUrl of the form shortUrlBase/foo that has not been used return it and create a shortening for it lookup (shortUrl: String): (targetUrl: String) requires some shortening with shortUrl eﬀect returns targetUrl corresponding to it delete (shortUrl: String) requires some shortening with shortUrl eﬀect removes the shortening purpose principle actions state
## user-provided short url sufﬁx
expire short after some time track uses of short url require authenticated users …
## concept UrlShortening
purpose shorter or more memorable way to link principle after create generates a short url, lookup will return the original url state a set of Shortenings with a targetUrl String a shortUrl String actions register (shortUrlSuﬃx, shortUrlBase, targetUrl: String): (shortUrl: String) lookup (shortUrl: String): (targetUrl: String) delete (shortUrl: String)
## concept NonceGenerator [Context]
purpose generate unique strings within a context principle each generate returns a string not returned before for that context state a set of Contexts with a used set of Strings actions generate (context: Context) : (nonce: String) return a nonce that is not already used by this context (one possible implementation is to just increment a counter, and the used set is then implicit in the current counter value)
## concept ExpiringResource [Resource]
purpose expire resources automatically to manage costs principle after setting expiry for a resource, the system will expire it after given time state a set of Resources with an expiry DateTime actions setExpiry (resource: Resource, seconds: Int) associate with resource an expiry that is now plus seconds if resource already has an expiry, override it system expireResource () : (resource: Resource) requires expiry of resource is before the current time forget resource and its expiry
## concept WebAnalytics
purpose track visits to links principle after a series of visits to various urls, can see stats on which and when visited state a urls set of String // check this a set of Visits with a url string a DateTime an ip String // originating IP address of request actions register (url: String) visit (url: String, date: DateTime, ip: String)
## sync generateNonce
when Web.request (method: "shortenUrl", shortUrlBase) then NonceGenerator.generate (context: shortUrlBase) sync registerShort when Web.request (method: "shortenUrl", targetUrl, shortUrlBase)
**NonceGenerator.generate (): (nonce)**
then UrlShortening.register (shortUrlSuﬃx: nonce, shortUrlBase, targetUrl) sync registerAnalytics when UrlShortening.register (): (shortUrl) then WebAnalytics.register (url: shortUrl) sync setExpiry when UrlShortening.register (): (shortUrl) then ExpiringResource.setExpiry (resource: shortUrl, seconds: 3600)
## sync lookupSync1
when
**Web.request (method = "get", url)**
then
**UrlShortening.lookup (shortUrl: url)**
sync lookupSync2 when
**Web.request (method = "get", url)**
**UrlShortening.lookup (): (targetUrl)**
then
**Web.redirect (targetUrl)**
sync deleteOnExpiry when
**ExpiringResource.expireResource () : (resource: shortUrl)**
then
**UrlShortening.delete (shortUrl)**
## conclusions

_(No extractable text on this slide)_
## Slide 34

3. The stock market is going to crash this year
1. LLMs won’t ever be able to do that
2. X is too corrupt to get elected
## better structure will amplify the benefits of advances in LLMs
as LLMs get better, our approach will be even more effective better structure enables scaling to the max that current LLMs can support better structure reduces costs fewer tokens in LLM context saves money and time better structure improves security can audit a module and ensure it doesn’t get modified
## initial motivations
better UX clarity & power modularity in design & code a design language bridging roles too a place for design concept-speciﬁc issues what may matter as much or more
## paper appearing any day now
book about concept design website: essenceofsoftware.com
