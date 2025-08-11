# Simple State Form (SSF) Specification

## Purpose

Simple State Form (SSF) is a human-readable data modeling syntax designed specifically for concept design. It bridges the gap between conceptual thinking and technical implementation by being:

- **Human-Friendly**: Easy to read and understand, even for non-technical stakeholders
- **AI-Friendly**: Easily parseable by LLMs for automated code generation
- **Database-Agnostic**: Translatable to MongoDB, SQL databases, Alloy, GraphQL, and more
- **Concept-Focused**: Optimized for the independent state management needs of concepts

## Design Philosophy

SSF embodies the concept design principle that **state should be simple and transparent**. Complex data structures often indicate that multiple concepts have been conflated. SSF encourages:

- **Clear Object Relationships**: Explicit modeling of how objects relate
- **Minimal Complexity**: First-order relationships (no sets of sets)
- **Type Safety**: Clear primitive and enumeration types
- **Independence**: No external dependencies in state definitions

## Semantic Features

The key semantic features of SSF are: the ability to declare sets of objects,
along with relations that map them to other objects or primitive values, and
subsets of these sets, with additional relations. A basic set of primitive types
is provided, as well as enumerations. The language is first-order, so an object
can be mapped to a set of objects or scalars, but not to a set of sets. Union
types are currently not supported.

## Grammar

- _schema_ ::= ( _set-decl_ | _subset-decl_ )\*
- _set-decl_ ::= \[ "a" | "an" \] ("element" | "set") \[ "of" \] _object-type_
  \[ "with" _field-decl_ \+ \]
- _subset-decl_ ::= \[ "a" | "an" \] _sub-type_ ("element" | "set") \[ "of" \] (
  _object-type_ | _sub-type_ ) \[ "with" _field-decl_ \+ \]
- _field-decl_ ::= \[ "a" | "an" \] \["optional"\] \[_field-name_\]
  (_scalar-type_ | _set-type_)
- _scalar-type_ ::= _object-type_ | _parameter-type_ | _enumeration-type_ |
  _primitive-type_
- _set-type_ ::= ("set" | "seq" ) \[ "of" \] _scalar-type_
- _enumeration-type_ ::= "of" (_enum-constant_ "or" )\+ _enum-constant_

## Grammar conventions

- \[ x \] means x is optional
- In ( x ), the parens used for grouping, and do not appear in the actual
  language
- a | b means either a or b
- x \* means an iteration of zero or more of x
- x \+ means an iteration of one or more of x

## Grammar constraints

- A _field-name_ may be omitted only for declaring a field of _object-type_ or
  _parameter-type_. Omitting the field name is equivalent to including a name
  that is the same as the name of the type but with the first character in lower
  case.
- The hierarchy that is specified by _subset-decls_ cannot contain cycles. Thus,
  a _subset-decl_ may not, for example, declare a subset with a _sub-type_ that
  is the same as the _sub-type_ that it is a subset of.
- The _field-names_ within a _set-decl_ or _subset-decl_ must be unique. Also,
  within all the decls that are in the hierarchy beneath a _set-decl_,
  _field-names_ must be unique.
- A _field-decl_ that has a _set-type_ cannot use the _optional_ keyword.

## Lexical considerations: identifiers

- The identifiers _enum-constant_, _field-name_, _sub-type_, _object-type_,
  _parameter-type_ and _primitive-type_ are sequences of alphabetic characters,
  digits and underscores, starting with an alphabetic character. The alphabetic
  characters in an _enum-constant_ must all be uppercase. A _field-name_ must
  start with a lower case alphabetic character. A _subset-name_, _object-type_,
  _parameter-type_ or _primitive-type_ must start with an upper case alphabetic
  character.
- The standard values from which a _primitive-type_ is drawn are "Number",
  "String", "Flag", "Date", "DateTime".

## Lexical considerations: layout

- The language is whitespace-sensitive to ensure unambiguous parsing
- Each declaration must occupy a single line
- Field declarations must be indented beneath the set declarations they belong
  to
- Types can optionally be pluralized, so "a set of Strings" is equivalent to "a
  set of String"
- Type names must always be capitalized ("User") and field and collection names
  are not capitalized ("email")
- Enumeration values (and no other names or types) are in uppercase
- The name of a field can be omitted only for an object type or a set of object
  types, in which case the implicit name of the field is the lowercased version
  of the type name, singular for a scalar and plural for a set.

## Semantics

- Set and subset declarations introduce sets of objects, named by _object-types_
  and _sub-types_. Every member of a subset is expected also to be a member of
  the corresponding superset. For a regular object type, adding an object to a
  set will typically correspond to creating the object; in contrast, adding an
  object to a subset involves taking an existing object and making it belong to
  the subset. This is not true for a parameter type, which represents objects
  allocated elsewhere, and which can therefore be added to a top level set
  without needing to be created.
- The subsets of a set can overlap. Subsets offer a way both to classify objects
  (in a traditional subtype hierarchy) and also a way to declare relations on
  existing sets without extending the set declaration.
- When the keyword "element" is used rather than "set" in a set or subset
  declaration, the declared set is constrained to contain exactly one object.
- The value of an object is just its identity, so an object should not be
  thought of as a composite. But the notion of an object (as in object-oriented
  programming) is naturally represented as an object with fields, where the
  fields are considered to be relations mapping the object (identity) to other
  values.
- Every field can be viewed as a relation that maps an object to a set of values
  that may be empty or may contain a single value or multiple values. An
  optional scalar field corresponds to the empty case. A field with a set type
  should _not_ be declared as optional; instead an empty set should be used when
  there is no value to map to.
- A field that is declared with the seq keyword is like one declared with the
  set keyword, except that the elements are ordered.

## Basic Examples

### Simple Object Types

A basic concept for user identity:

```ssf
a set of Users with
  a username String
  an email String
```

### Relationships Between Objects

Users can follow other users:

```ssf
a set of Users with
  a username String
  a followers set of Users
```

### Implicit Field Names

When the field name matches the type (using lowercase), you can omit it:

```ssf
a set of Users with
  a Profile  # Creates field named "profile"
```

### Enumerated Values

For controlled vocabularies:

```ssf
a set of Users with
  a username String
  a status of PENDING or ACTIVE or SUSPENDED
```

### Singleton Elements

For global configuration or single-instance data:

```ssf
an element GlobalSettings with
  a deployed Flag
  an applicationName String
  an apiKey String
```

## Advanced Examples

### URL Shortening Concept State

From the Sundai-25 presentation example:

```ssf
a set of Shortenings with
  a targetUrl String
  a shortUrl String
  an optional createdAt DateTime
```

### Hierarchical Relationships

For nested structures like file systems:

```ssf
a set of Folders with
  an optional parent Folder
  a name String
  
a RootFolder element of Folder

a set of Files with 
  a folder Folder
  a name String
  a size Number
```

### Complex Content Management

Showing multiple concepts working together:

```ssf
# Article concept state
a set of Articles with
  a title String
  a content String
  a publishedAt DateTime
  a tags set of String

# Comment concept state  
a set of Comments with
  a content String
  a target String  # Could reference Article, User, etc.
  a createdAt DateTime

# Tag concept state
a set of Tags with
  a name String
  a color String
```

A set of users, and a subset that have been banned on a particular date and by a
particular user:

    a set of Users with
      a username String
      a password String

    a Banned set of Users with
      a bannedOn Date
      a bannedBy User

A subset without any relations:

    a set of Users with
      a username String
      a password String

    a Banned set of Users

A set of items, classified into books and movies:

    a set of Items with
      a title String
      a created Date

    a Books set of Items with
      an isbn String
      a pageCount Number
      an author Person
      
    a Movies set of Items with
       an imdb String
       a director String 
       an actors set of Persons

    a set of Persons with
       a name String
       a dob Date

A mapping defined separately on a set, using a subset (defining a relation
called _followers_ mapping users in the subset _Followed_ to users):

    a set of Users with
      a username String
      a password String
      
    a Followed set of Users with
      a followers set of Users

An implicitly named field (called _profile_, relating _Users_ to _Profiles_)

    a set of Users with 
      a Profile

An implicitly named set-typed field (called _options_, relating _Questions_ to
Options)

    a set of Questions with 
      a set of Options

A model of a simple folder scheme in which folders and files have names:

    a set of Folders with
      an optional parent Folder
      a name String
      
    a RootFolder element of Folder

    a set of Files with 
      a Folder
      a name String

A model of a Unix like scheme in which names are local to directories:

    a set of FileSystemObjects

    a Files set of FileSystemObjects

    a Directories set of FileSystemObjects with
      a set of Entries
      
    a RootDirectory element of Directories

    a set of Entries with
      a name String
      a member FileSystemObject

## Diagrammatic form

A schema is easily translated into a diagram as follows:

- Create a node for each set or subset declaration and label it with the set or
  subset name.
- For each subset declaration, draw a dotted arrow to the node that it is
  declared to be a subset of.
- For each field of a set or a subset, draw a solid arrow labeled by the field
  name to the target type, which is either a set or subset node, or a fresh node
  with an appropriate label for a primitive type.
- An enumeration is drawn by introducing a set node for the type as a whole, and
  a subset node for each of the enumeration constants.

## MongoDB Translation Guide

### Collection Mapping

**Rule**: Each SSF set/subset becomes a MongoDB collection

```ssf
a set of Users with          →  users collection
  a username String          →  {username: string, email: string, _id: ObjectId}
  an email String
```

### Field Type Translations

| SSF Type | MongoDB Type | Example |
|----------|--------------|----------|
| `String` | `string` | `"hello world"` |
| `Number` | `number` | `42` |
| `Flag` | `boolean` | `true` |
| `Date` | `Date` | `ISODate("2023-12-01")` |
| `DateTime` | `Date` | `ISODate("2023-12-01T10:30:00Z")` |
| `set of X` | `array` | `["id1", "id2", "id3"]` |
| `of A or B` | `string` | `"PENDING"` (enum value) |

### Practical Examples

#### URL Shortening Collection

```ssf
a set of Shortenings with
  a targetUrl String
  a shortUrl String
```

Becomes MongoDB document:
```javascript
{
  _id: ObjectId("..."),
  targetUrl: "https://example.com",
  shortUrl: "https://short.ly/abc123"
}
```

#### User Collection with Relationships

```ssf
a set of Users with
  a username String
  a followers set of Users
  a status of ACTIVE or SUSPENDED
```

Becomes MongoDB document:
```javascript
{
  _id: ObjectId("user123"),
  username: "alice",
  followers: [ObjectId("user456"), ObjectId("user789")],
  status: "ACTIVE"
}
```

### Implementation Best Practices

#### Index Strategy

```javascript
// For Users collection
db.users.createIndex({username: 1}, {unique: true});
db.users.createIndex({email: 1}, {unique: true});
db.users.createIndex({status: 1});

// For Shortenings collection  
db.shortenings.createIndex({shortUrl: 1}, {unique: true});
db.shortenings.createIndex({targetUrl: 1});
```

#### TypeScript Interface Generation

```typescript
// Generated from SSF
interface User {
  _id: ObjectId;
  username: string;
  email: string;
  followers: ObjectId[];
  status: 'ACTIVE' | 'SUSPENDED';
}

interface Shortening {
  _id: ObjectId;
  targetUrl: string;
  shortUrl: string;
}
```

### Advanced Translation Patterns

#### Singleton Elements

```ssf
an element GlobalSettings with
  a deployed Flag
```

Becomes a collection with exactly one document:
```javascript
// Collection: globalSettings
{
  _id: ObjectId("singleton"),
  deployed: true
}
```

#### Optional Fields

```ssf
a set of Users with
  a username String
  an optional bio String
```

Becomes:
```javascript
{
  _id: ObjectId("..."),
  username: "alice",
  bio: "Software developer"  // May be undefined/null
}
```
