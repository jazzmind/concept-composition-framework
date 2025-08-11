# sundai 25 — An Intro to Concept Design for Coding

*Daniel Jackson · MIT EECS/CSAIL · Sundai Club · Aug 10, 2025*

---

## Slide 1

- Daniel Jack son á MIT EECS/CSAIL á Sundai Club á Aug 10, 2025
- an in tro to
- co n ce p t d e s i g n
- fo r co d i n g

## how good are

- LL M s a t c o d i n g ?

## a benchmar k and it s analysis

- a benchmar k for realis tic coding problems
- 2,294 issue/pull reques t pair s from 12 Py t hon repos
- bes t LLM resolves 65% of issues
- follow -up s tudy at Yor k U niver sity
- 33% of g ood patches ÒcheatedÓ: code appear s in issue
- 31% of patches deemed cor rec t by incomplete tes t s
- 94% issues were present before training cutoff
- wit h all t his, resolution rate for GPT-4 falls to 0.55%
- in shor t : LLM-based coding assis t ants
- often sugg es t code t hat doesnÕt wor k
- and break s e xis ting func tionality

## Slide 4

- how much does AI speedup skilled developer s on real codebases?
- METR s tudy (10 July 2025)
- Randomized control tr ial
- 16 developer s on 246 t ask s

## Developers qualitatively note LLM tooling performs worse in more complex

- environments. One developer saysÒ
- it also made some weird changes in
- other parts of the code
- that cost me time to
- Þ
- nd and remove [...] My feeling
- is the refactoring necessar y for this PR wasÒtoo bigÓ [and genAI] introduced
- as many errors as it
- Þ
- xed.Ó Another developer comments that one prompt
- Òfailed to properly apply the edits and
- started editing random other parts
- of
- the
- Þ
- le,Ó and that these failures seemed to be heavily related toÒthe size of a
- single
- Þ
- le it is attempting to perform edits onÓ.

## might LLMs in spire

- ustorethinksoftware?

## LLMs: t he canar y in t he mine

- LLMs e xpose deep f laws in how we build software
- software is br ittle, poor ly org anized & needlessly comple x
- LLMs fail for t he same reasons as human prog rammer s
- some mis t akes we make
- fo c u s o n c o d e a t e x p e n s e o f d e s i g n
- underes timating cos t of technical debt
- oppor tunity to ret hink our approach
- better not only for LLMs but for humans too!

## increment ality & integ r ity

- small chang es are hard to make
- and r isk breaking ever y t hing
- the problem

## transparency

- clear where to
- Þ
- nd somet hing
- code cor responds to behavior
- modular ity
- each feature in it s own place
- chang es donÕt propag ate
- the solution

## Re a l Wo r l d ,

- a f u ll- stack
- benchmark

## Slide 11

_(No extractable text)_

## a typical architec ture

- Comment
- routes
- Comment
- controller
- Comment
- model
- Tag
- routes
- Tag
- controller
- Tag
- model
- Ar ticle
- routes
- Ar ticle
- controller
- Ar ticle
- model
- User
- routes
- User
- controller
- User
- model
- routing layer
- encapsulates
- HTTP
- controller layer
- encapsulates
- business logic
- model layer
- encapsulates
- dat abase s torag e

## desig n r ules

- Comment
- routes
- Comment
- controller
- Comment
- model
- Tag
- routes
- Tag
- controller
- Tag
- model
- Ar ticle
- routes
- Ar ticle
- controller
- Ar ticle
- model
- User
- routes
- User
- controller
- User
- model
- modular ity
- of ser vices
- transparency
- each increment
- has a clear home

## why are desig n r ules broken? OOP!

- User
- Ar ticle
- favor ites
- many features involve >1 objec t
- eg, favor ites relates User s to Ar ticles
- Ar ticle
- Comment
- addComment
- OOP encourages dependencies
- eg, addComment is met hod of Ar ticle
- User
- objec ts con
- ß
- ate features
- aut hentication, pro
- Þ
- les, following
- are all in User

## co n ce p t s :

- a n e w mo du larity

## a sample concept : U pvote

- whatÕs a concept?
- a coherent
- unit
- of behavior
- user
- -facing (a behavioral patter n)
- a nano
- ser vice
- (a backend API)
- reusable
- &
- familiar
- desig ned, coded and e xplained
- independently

## concept

- Upvote [User, Item]
- state
- a
- se t of Votes wit h
- a voter User
- a t arge t Item
- act ions
- upvote (u: User, i: Item)
- unvote (u: User, i: Item)
- pur pose
- r ank items by popul ar ity
- pr inc iple
- after ser ies of votes of
- items, t he items can be r anked by
- t heir number of votes
- de
- Þ
- ning a concept
- User
- t arge t
- Vote
- Item
- voter

## concept

- Upvote
- pur pose
- r ank items by popul ar ity
- pr inc iple
- after ser ies of votes of
- items, t he items can be r anked by
- t heir number of votes
- concept
- Reaction
- pur pose
- send reactions to aut hor
- pr inc iple
- when user selects
- reaction, it Õs shown to t he aut hor
- (often in aggregated for m)
- concept
- Recommendation
- pur pose
- use pr ior likes to recommend
- pr inc iple
- user Õs likes lead to r anking
- of kinds of items, de ter mining which
- items are recommended
- similar UIs, different concept s

## e xtreme decoupling (xd): syncs & polymor phism

- how to ensure concept s are independent?
- no calls
- from one to anot her
- no assumptions
- about e xter nal
- types
- sync
- NotifyAut horOnUpvote
- when
- Upvote.upvote (item)
- where
- aut hor of item is user in Pos t concept
- then
- Noti
- Þ
- cation.notify (user, item + Ò upvoted Ó)
- suppose we want to notif y author s when their post s are upvoted
- we have Upvote.upvote (É) and Noti
- Þ
- cation.notif y (É)
- concept
- Upvote [User, Item]
- state
- a
- se t of Votes wit h
- a voter User
- a t arge t Item

## e xploiting concept modular ity to g enerate code

- concept
- spec
- concept
- code
- sync
- spec
- sync
- code
- front-end
- spec
- front-end
- code
- deployed
- app
- concept
- spec
- LLM
- prompt
- code

## Slide 21

- co n ce p t s a r e nÕ t o b j e c t s

## back to RealWor ld

- Comment
- routes
- Comment
- controller
- Comment
- model
- Tag
- routes
- Tag
- controller
- Tag
- model
- Ar ticle
- routes
- Ar ticle
- controller
- Ar ticle
- model
- User
- routes
- User
- controller
- User
- model
- using a concept design lens, some problems become evident
- theydonÕtcoverconcept sthatlackobjec t s(eg,following,favoriting)
- each s t ack doesnÕt fully encapsulate it s func tionality

## compar ing objec t (class) to concept

- Tag
- Objec t
- Tag
- Concept
- func tionality
- cont ained
- objec ts
- involved
- gener icity
- of references
- modular ity
- summar y
- t ag for mat,
- but not adding or
- deleting (which is in
- Ar ticle objec t)
- jus t t ag objec t s
- none: reference to Tag
- in Ar ticle is e xplicit
- not really
- modular
- all func tions
- associated wit h t ags
- t ags and items t agg ed
- fully polymor phic:
- t agg ed item can be
- any type
- fully modular
- & reusable

## a mo du larity

- exe r c i s e

## Slide 25

- can you design a concept for URL shor tening (like tinyur l, eg)?
- concept
- Ur lShor tening
- pur pose
- shor ter or more memor able w ay to link
- pr inc iple
- after create gener ates a shor t ur l , lookup will re tur n t he or iginal ur l
- state
- a se t of Shor tenings wit h
- a t arge tUr l Str ing
- a shor tUr l Str ing
- act ions
- create (shor tUr lBase, t arge tUr l : Str ing): (shor tUr l : Str ing)
- pick any shor tUr l of t he for m shor tUr lBase/foo t hat has not been used
- re tur n it and create a shor tening for it
- lookup (shor tUr l : Str ing): (t arge tUr l : Str ing)
- requires some shor tening wit h shor tUr l
- e
- !
- ect re tur ns t arge tUr l cor responding to it
- dele te (shor tUr l : Str ing)
- requires some shor tening wit h shor tUr l
- e
- !
- ect removes t he shor tening
- pur pose
- pr inciple
- ac tions
- s t ate

## Slide 26

- what ot her features might a URL shor tening ser vice offer?
- user-provided
- shor t ur l suf
- Þ
- x
- e xpire
- shor t after some time
- track
- uses of shor t ur l
- require
- aut henticated user s
- É

## a more minimal shor tening concept

- concept
- Ur lShor tening
- pur pose
- shor ter or more memor able w ay to link
- pr inc iple
- after create gener ates a shor t ur l , lookup will re tur n t he or iginal ur l
- state
- a se t of Shor tenings wit h
- a t arge tUr l Str ing
- a shor tUr l Str ing
- act ions
- regis ter (shor tUr lSu
- "
- x, shor tUr lBase, t arge tUr l : Str ing): (shor tUr l : Str ing)
- lookup (shor tUr l : Str ing): (t arge tUr l : Str ing)
- dele te (shor tUr l : Str ing)

## a concept for g enerating nonces

- concept
- NonceGener ator [Conte xt]
- pur pose
- gener ate unique s tr ings wit hin a conte xt
- pr inc iple
- each gener ate re tur ns a s tr ing not re tur ned before for t hat conte xt
- state
- a se t of Conte xts wit h
- a used se t of Str ings
- act ions
- gener ate (conte xt : Conte xt) : (nonce: Str ing)
- re tur n a nonce t hat is not already used by t his conte xt
- (one possible implement ation is to jus t increment a counter,
- and t he used se t is t hen implicit in t he cur rent counter v alue)

## a concept for e xpir ing resources

- concept
- Expir ingResource [Resource]
- pur pose
- e xpire resources automatically to manage cos ts
- pr inc iple
- after se tting e xpir y for a resource, t he sy s tem will e xpire it after given time
- state
- a se t of Resources wit h
- an e xpir y DateT ime
- act ions
- se tExpir y (resource: Resource, seconds: Int)
- associate wit h resource an e xpir y t hat is now plus seconds
- if resource already has an e xpir y, over r ide it
- sy s tem e xpireResource () : (resource: Resource)
- requires e xpir y of resource is before t he cur rent time
- forge t resource and its e xpir y

## a concept for tracking visit s

- concept
- WebAnalytics
- pur pose
- tr ack visits to link s
- pr inc iple
- after a ser ies of visits to v ar ious ur ls, can see s t ats on which and when visited
- state
- a ur ls se t of Str ing // check t his
- a se t of V isits wit h
- a ur l s tr ing
- a DateT ime
- an ip Str ing // or iginating IP address of reques t
- act ions
- regis ter (ur l : Str ing)
- visit (ur l : Str ing, date: DateT ime, ip: Str ing)

## some syncs for set ups

- sync
- gener ateNonce
- when
- Web.reques t (me t hod: "shor tenUr l", shor tUr lBase)
- then
- NonceGener ator.gener ate (conte xt : shor tUr lBase)
- sync
- regis terShor t
- when
- Web.reques t (me t hod: "shor tenUr l", t arge tUr l , shor tUr lBase)
- NonceGener ator.gener ate (): (nonce)
- then
- Ur lShor tening.regis ter (shor tUr lSu
- "
- x: nonce, shor tUr lBase, t arge tUr l)
- sync
- regis terAnalytics
- when
- Ur lShor tening.regis ter (): (shor tUr l)
- then
- WebAnalytics.regis ter (ur l : shor tUr l)
- sync
- se tExpir y
- when
- Ur lShor tening.regis ter (): (shor tUr l)
- then
- Expir ingResource. se tExpir y (resource: shor tUr l , seconds: 3600)

## syncs for lookup and e xpir y

- sync
- lookupSync1
- when
- Web.reques t (me t hod = "ge t", ur l)
- then
- Ur lShor tening.lookup (shor tUr l : ur l)
- sync
- lookupSync2
- when
- Web.reques t (me t hod = "ge t", ur l)
- Ur lShor tening.lookup (): (t arge tUr l)
- then
- Web.redirect (t arge tUr l)
- sync
- dele teOnExpir y
- when
- Expir ingResource. e xpireResource () : (resource: shor tUr l)
- then
- Ur lShor tening. dele te (shor tUr l)

## co n c l u s i o n s

_(No additional text)_

## top predic tions you should never make

- 3. The stock market is going to crash this year
- 1. LLMs wonÕt ever b e ab l e to do that
- 2. X is too corrupt to get elected

## so why

- Þ
- x t he s tr uc ture of software?
- better s tr uc ture will amplify t he benef it s of advances in LLMs
- as LLMs g et better, our approach will be even more effec tive
- better s tr uc ture enables scaling
- to t h e m a x t h a t c u r r e n t L L M s c a n s u p p o r t
- better s tr uc ture reduces cos t s
- fewe r to ke n s i n L L M c o n te x t s ave s m o n ey a n d t i m e
- better s tr uc ture improves secur ity
- can audit a module and ensure it doesnÕt g et modified

## t he bene

- Þ
- t s concept s br ing
- better UX
- clar ity & power
- modular ity
- in desig n & code
- a design language
- br idging roles too
- a place for design
- concept-speci
- Þ
- c issues
- initial motivations
- what may matter as much or more

## for more infor mation

- paper appear ing any day now
- book about concept desig n
- website: essenceofsoftware.com
