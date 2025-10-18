# WriteTogether Word Bank Schema

## 1. Overview

WriteTogether ingests word banks from plain text files organised within a predictable folder hierarchy. The structure allows the app to:

- Index all word bank files on startup without migrations.
- Filter entries by year group, text type, and sub-type.
- Support full-text search across content and metadata.
- Accept new headings or topics without schema changes.

Teachers can publish new resources by dropping text files into the correct directory, keeping the workflow lightweight and versionable.

## 2. Folder & File Structure

```
/wordbanks/
  /Y1/
    /narrative/
      /traditional-tales/
        y1__narrative__traditional-tales__woodland-quest__v1.txt
    /non-narrative/
      /instructions/
        y1__non-narrative__instructions__planting-seeds__v1.txt
    /poetry/
      /rhyming-poems/
        y1__poetry__rhyming-poems__animal-rhymes__v1.txt
  ...
  /Y6/
```

**Naming convention**

```
y{1-6}__{text_type}__{sub_type}__{topic-slug}__v{n}.txt
```

- `text_type ∈ {narrative, non-narrative, poetry}`
- `sub_type` must be one of the approved lists below.
- `topic-slug` is kebab-case (for example `planting-seeds`).
- `v{n}` is the revision number (for example `v1`, `v2`).

## 3. Text Types and Sub-Types

**Narrative**

- narrative-stories
- traditional-tales
- fables
- playscripts
- dialogue-scenes
- stories-from-other-cultures
- modern-picture-books
- chapter-books-novels
- narrative-poems

**Non-Narrative**

- instructions
- recounts
- reports
- explanations
- persuasive-texts
- arguments-discussion
- biographies-autobiographies
- information-texts
- labels-captions
- timetables-schedules
- maps-diagrams-annotations
- emails-digital-messages
- book-reviews-reading-journals
- postcards-invitations
- posters-leaflets
- school-newsletters-bulletins

**Poetry**

- rhyming-poems
- acrostic-poems
- shape-concrete-poems
- kennings
- haiku
- free-verse
- narrative-poems
- performance-poetry

## 4. File Format Rules

- Files are plain UTF-8 `.txt`.
- The first paragraph must be the **Meta** block.
- Each subsequent paragraph begins with a heading followed by a comma-separated list.
- Multi-word phrases use square brackets, e.g. `[wave dancer]`.
- Blank lines separate headings.
- Headings are extensible; any new heading is indexed automatically.

## 5. Meta Block (Mandatory)

Example:

```
Meta
year: Y4
text_type: poetry
sub_type: kennings
topic: Animal Life
subject_links: English, Science
keywords: movement, rhythm, pattern
reading_age: 8-9
author: JM
version: 1
```

**Required fields:** `year`, `text_type`, `sub_type`

**Optional fields:** `topic`, `subject_links`, `keywords`, `reading_age`, `author`, `version`

## 6. Example Files

### Narrative – Y1 Traditional Tale

```
Meta
year: Y1
text_type: narrative
sub_type: traditional-tales
topic: Woodland Quest
subject_links: English
keywords: forest, wolf, brave, basket, path
reading_age: 5-6
version: 1

Nouns
girl, wolf, basket, path, forest, cottage

NounPhrases
[the dark woods], [the winding path], [a red cloak]

Verbs
walks, hides, whispers, knocks, helps

Adverbials
[In the forest], [Along the path], [At the gate]

Starters
[Once upon a time,], [One day,], [In the end,]
```

### Non-Narrative – Y2 Instructions

```
Meta
year: Y2
text_type: non-narrative
sub_type: instructions
topic: Planting Seeds
subject_links: Science
keywords: seeds, soil, sunlight, germinate
reading_age: 6-7
version: 1

Nouns
seeds, pot, soil, trowel, watering-can

VerbPhrases
[fill the pot], [press the soil], [water carefully], [place in sunlight]

Adverbials
[First,], [Next,], [After that,], [Finally,]

DomainTerms
germinate, seedling, nutrients, sunlight
```

### Poetry – Y4 Kennings

```
Meta
year: Y4
text_type: poetry
sub_type: kennings
topic: Animal Life
subject_links: English, Science
keywords: movement, rhythm, pattern
reading_age: 8-9
version: 1

Nouns
lion, fish, bird, snake, fox

PoeticDevices
alliteration, repetition, metaphor

Structure
two-word lines, noun-noun pattern

Examples
[hunter prowler], [wave dancer], [sky singer], [grass crawler]
```

## 7. Indexing Logic

When the application boots:

1. Recursively scan `/wordbanks` for `.txt` files.
2. Parse the Meta block for `year`, `text_type`, `sub_type`, `topic`, `keywords`.
3. Register remaining headings with their word lists.
4. Store arbitrary headings as dynamic dictionaries.
5. Expose filters in the teacher console:
   - Keyword search (full text).
   - Year, text_type, sub_type (required filters).
   - Optional: subject_links, reading_age.

## 8. Authoring Guidelines for Teachers

- Focus each file on one teaching unit or topic.
- Always begin with the Meta block.
- Introduce new headings as needed (e.g. `FigurativeLanguage`, `Transitions`).
- Use square brackets for phrases.
- Separate entries with commas; avoid bullets.
- Leave blank lines between sections for readability.

---

Following these conventions keeps resource creation simple while giving WriteTogether a structured, searchable catalogue of vocabulary assets. We can expand headings and metadata organically as classroom needs evolve.
