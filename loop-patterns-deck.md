# Deck 2.5: Loop Patterns for Easy LeetCode

## Card 1: Count Variable

**What it is:** A single number used to count how many items match a condition.

**Use when the problem asks:**
- how many?
- count the number of...
- return the number of items that...

**Pattern:**
```python
count = 0
for x in items:
    if condition:
        count += 1
return count
```

**Example:**
```python
ages = [75, 92, 40]
count = 0
for age in ages:
    if age > 60:
        count += 1
# count = 2
```

**Use this for:**
- Number of Senior Citizens
- Count Consistent Strings
- Counting Elements

Do not use Counter here if you only need one final total.

**Mental rule:**
```
Counting total matching items -> count variable
Counting each value separately -> Counter / frequency dict
```

---

## Card 2: Running Total

**What it is:** A variable that keeps adding values as you loop.

**Use when the problem asks:**
- sum
- total
- score
- add all differences
- calculate final amount

**Pattern:**
```python
total = 0
for x in items:
    total += value
return total
```

**Example: Score of a String**
```python
total = 0
for i in range(len(s) - 1):
    total += abs(ord(s[i + 1]) - ord(s[i]))
return total
```

You do not need a list if the problem only asks for the final sum. Only use a list if you need to return or store every difference.

**Mental rule:**
```
Need one final score? -> total
Need all values? -> list
```

---

## Card 3: Running Maximum

**What it is:** A variable that remembers the biggest value seen so far.

**Use when the problem asks:**
- maximum
- largest
- longest
- best
- highest

**Pattern:**
```python
best = 0
for x in items:
    best = max(best, x)
return best
```

**Example:**
```python
nums = [3, 8, 2, 10]
best = 0
for n in nums:
    best = max(best, n)
# best = 10
```

**Common pair:**
```python
current = something
best = max(best, current)
```

**Mental rule:**
```
"maximum" usually means I need a best variable.
```

---

## Card 4: Streak Counter

**What it is:** A counter that grows while a condition is true and resets when it breaks.

**Use when the problem says:**
- consecutive
- in a row
- longest streak
- continuous

**Pattern:**
```python
current = 0
best = 0
for x in items:
    if condition:
        current += 1
        best = max(best, current)
    else:
        current = 0
return best
```

**Example: Max Consecutive Ones**
```python
current = 0
best = 0
for n in nums:
    if n == 1:
        current += 1
        best = max(best, current)
    else:
        current = 0
return best
```

**Walkthrough for [1, 1, 0, 1, 1, 1]:**
```
1 -> current = 1, best = 1
1 -> current = 2, best = 2
0 -> current = 0, best = 2
1 -> current = 1, best = 2
1 -> current = 2, best = 2
1 -> current = 3, best = 3
```

**Why not Counter?** Counter gives total count of 1s, not longest streak.
```
Frequency of 1s = 5
Longest consecutive 1s = 3
```

---

## Card 5: Build New List

**What it is:** Start with an empty list and append answers as you loop.

**Use when the problem asks you to return:**
- a new array
- a transformed list
- filtered values
- results for each item

**Pattern:**
```python
ans = []
for x in items:
    ans.append(something)
return ans
```

**Example:**
```python
nums = [1, 2, 3]
ans = []
for n in nums:
    ans.append(n * 2)
# ans = [2, 4, 6]
```

**List comprehension alternative:**
```python
ans = [n * 2 for n in nums]
```

**Use this for:**
- Concatenation of Array
- Find Words That Can Be Formed by Characters
- Find the Difference of Two Arrays

**Mental rule:**
```
Return many values -> ans list
Return one number -> count / total / best
```

---

## Card 6: Preallocated List

**What it is:** Create a list with a fixed size before filling it by index.

**Use when:**
- you know the exact output size
- you need to assign by position
- the problem gives formulas like `ans[i] = ...`

**Pattern:**
```python
ans = [0] * size
for i in range(size):
    ans[i] = value
return ans
```

**Example: Concatenation of Array**
```python
n = len(nums)
ans = [0] * (2 * n)
for i in range(n):
    ans[i] = nums[i]
    ans[i + n] = nums[i]
return ans
```

**Shortcut:**
```python
return nums + nums
```

**Common mistake:**
```python
len(ans) = 2 * n   # invalid, cannot assign to len()
```

**Correct:**
```python
ans = [0] * (2 * n)
```

---

## Card 7: Index Loop

**What it is:** Looping through positions instead of directly through values.

**Use when you need:**
- `s[i]`
- `s[i + 1]`
- `nums[i - 1]`
- position-based comparison
- slicing by position

**Pattern:**
```python
for i in range(len(items)):
    print(i, items[i])
```

**For adjacent pairs:**
```python
for i in range(len(items) - 1):
    print(items[i], items[i + 1])
```

**Example: Score of a String**
```python
for i in range(len(s) - 1):
    total += abs(ord(s[i + 1]) - ord(s[i]))
```

**Why `len(s) - 1`?** Because `s[i + 1]` must stay inside the string. If `i` reaches the last index, `i + 1` is out of bounds.

**Mental rule:**
```
Using i + 1? Loop to len(s) - 1.
```

---

## Card 8: Direct Item Loop

**What it is:** Looping through values directly when you do not need positions.

**Use when:**
- you only care about each item
- you do not need `i`
- you do not compare with neighbors

**Pattern:**
```python
for x in items:
    ...
```

**Example: Max Consecutive Ones**
```python
for n in nums:
    if n == 1:
        current += 1
    else:
        current = 0
```

**Example: Number of Senior Citizens**
```python
for person in details:
    age = int(person[11:13])
```

**Why not `range(len(...))`?**

Longer:
```python
for i in range(len(nums)):
    n = nums[i]
```

Cleaner:
```python
for n in nums:
```

**Mental rule:**
```
Need index? -> range or enumerate
Only need value? -> direct loop
```

---

## Card 9: Enumerate

**What it is:** A clean way to get both index and value while looping.

**Pattern:**
```python
for i, x in enumerate(items):
    ...
```

**Example:**
```python
nums = [10, 20, 30]
for i, n in enumerate(nums):
    print(i, n)
# 0 10
# 1 20
# 2 30
```

**Use when:**
- you need both position and value
- you are storing `value -> index`
- you are filling another list using index

**Example: Two Sum**
```python
seen = {}
for i, n in enumerate(nums):
    need = target - n
    if need in seen:
        return [seen[need], i]
    seen[n] = i
```

**Mental rule:**
```
Need index and value? -> enumerate
Need only value? -> normal for loop
Need only index? -> range
```

---

## Card 10: String Slicing by Fixed Positions

**What it is:** Taking a known part of a string using indexes.

**Pattern:**
```python
part = s[start:stop]
```

`stop` is exclusive.

**Example: Number of Senior Citizens**

Passenger string:
```
7868190130M7522
012345678901234
```

Breakdown:
```
0-9     phone number
10      gender
11-12   age
13-14   seat
```

Age:
```python
age = int(person[11:13])
```

**Why `11:13`?** It includes indexes 11 and 12, stops before index 13.

**Common mistake:**
```python
person[11]   # only first digit; "75" becomes "7"
```

**Correct:**
```python
person[11:13]
```

---

## Card 11: Negative Indexing

**What it is:** Using negative positions to access items from the end.

**Pattern:**
```python
items[-1]   # last
items[-2]   # second last
items[-3]   # third last
```

**Example: Length of Last Word**
```python
words = s.split()
last = words[-1]
return len(last)
```

**Third word from the end:**
```python
words[-3]
```

Negative indexing works only if that item exists.

**Safer version:**
```python
words = s.split()
if len(words) >= 3:
    return words[-3]
```

**Mental rule:**
```
From the end -> negative index
```

---

## Card 12: Split String into Words

**What it is:** `.split()` separates a string into words and ignores extra spaces.

**Pattern:**
```python
words = s.split()
```

**Example:**
```python
s = "   fly me   to   the moon  "
words = s.split()
# ["fly", "me", "to", "the", "moon"]
```

**Length of last word:**
```python
return len(s.split()[-1])
```

**Longest word:**
```python
longest = max(s.split(), key=len)
```

**Length of longest word:**
```python
return len(max(s.split(), key=len))
```

**Common mistake — removing all spaces:**
```python
[c for c in s if not c.isspace()]
# "Hello World" -> "HelloWorld"
```

Now you cannot tell where the last word starts.

**Mental rule:**
```
Need words? -> split()
Need characters? -> loop through string
```

---

## Card 13: ord() and ASCII Difference

**What it is:** `ord()` converts a character to its ASCII/Unicode number.

**Pattern:**
```python
ord("a")
```

**Example:**
```python
ord("a")  # 97
ord("z")  # 122
```

**Example: Score of a String**
```python
total = 0
for i in range(len(s) - 1):
    total += abs(ord(s[i]) - ord(s[i + 1]))
return total
```

**Common mistakes:**

Wrong:
```python
ord[i]
```

Correct:
```python
ord(s[i])
```

Wrong:
```python
|a - b|
```

Correct:
```python
abs(a - b)
```

**Mental rule:**
```
ASCII value -> ord(character)
Absolute difference -> abs(a - b)
```

---

## Card 14: Frequency Dictionary

**What it is:** A dictionary that counts how many times each value appears.

**Pattern:**
```python
freq = {}
for x in items:
    freq[x] = freq.get(x, 0) + 1
```

**Example:**
```python
nums = [1, 2, 2, 3, 3, 3]
# {1: 1, 2: 2, 3: 3}
```

**Meaning:**
```
value -> count
```

**Use for:**
- Valid Anagram
- Ransom Note
- First Unique Character
- Majority Element
- Maximum Number of Balloons

**Do not use for:**
- longest streak
- simple total count
- running sum

**Mental rule:**
```
Need count for each different value -> frequency dictionary
```

---

## Card 15: Counter

**What it is:** A shortcut frequency dictionary from `collections`.

**Pattern:**
```python
from collections import Counter
freq = Counter(items)
```

**Example:**
```python
Counter("banana")
# Counter({'a': 3, 'n': 2, 'b': 1})
```

**Access count:**
```python
freq["a"]  # 3
freq["z"]  # 0
```

**Valid Anagram:**
```python
return Counter(s) == Counter(t)
```

**Use when:**
- comparing frequencies
- counting characters
- counting numbers
- checking if two collections have same elements with same counts

**Mental rule:**
```
Same letters with same counts? -> Counter(s) == Counter(t)
```

---

## Card 16: Balance Dictionary

**What it is:** One dictionary used to add counts from one collection and subtract counts from another.

**Pattern:**
```python
freq = {}
for x in a:
    freq[x] = freq.get(x, 0) + 1
for x in b:
    freq[x] = freq.get(x, 0) - 1
for count in freq.values():
    if count != 0:
        return False
return True
```

**Example: Valid Anagram**
```python
s = "rat"
t = "tar"
```

After `s`:
```
{"r": 1, "a": 1, "t": 1}
```

After subtracting `t`:
```
{"r": 0, "a": 0, "t": 0}
```

Everything cancels — it is an anagram.

**Negatives:** If `t` has a character not in `s`, it becomes negative.
```python
s = "rat"
t = "car"
# "c" becomes 0 - 1 = -1, so not an anagram
```

**Mental rule:**
```
First string adds.
Second string subtracts.
All zero means match.
```

---

## Card 17: Set for Seen Items

**What it is:** A collection used to remember what you have already seen.

**Use when the problem asks:**
- duplicate?
- have I seen this before?
- unique items?
- intersection?
- membership?

**Pattern:**
```python
seen = set()
for x in items:
    if x in seen:
        return True
    seen.add(x)
return False
```

**Example: Contains Duplicate**
```python
seen = set()
for n in nums:
    if n in seen:
        return True
    seen.add(n)
return False
```

**Why not list?**

`x in list` scans one by one. `x in set` is fast.

**Mental rule:**
```
Existence only -> set
Count per value -> Counter/dict
```

---

## Card 18: Dictionary Mapping

**What it is:** A dictionary where each key points to a value.

**Pattern:**
```python
mapping[key] = value
```

Read as `key -> value`.

**Example: Two Sum**
```python
seen = {}
seen[number] = index
# number -> index
```

**Example: Single-Row Keyboard**
```python
pos[char] = index
# character -> keyboard position
```

**Example: Logger Rate Limiter**
```python
last_seen[message] = timestamp
# message -> last printed time
```

Before coding a dictionary problem, write:
```
My dictionary stores _____ -> _____
```

**Mental rule:**
```
Need to find related info fast? -> dict mapping
```

---

## Card 19: When Not to Use Dictionary

**What it is:** Some problems look like counting problems but do not need a dictionary.

**Use a simple count when** the problem asks for one final number:
```python
count = 0
```

**Use a running total when** the problem asks for a sum/score:
```python
total = 0
```

**Use current + best when** the problem asks for longest consecutive streak:
```python
current = 0
best = 0
```

**Use Counter/dict when** the problem asks for frequency of each value:
```python
freq = Counter(nums)
```

**Examples:**

| Problem | Use |
| --- | --- |
| Number of Senior Citizens | `count` |
| Score of a String | `total` |
| Max Consecutive Ones | `current`, `best` |
| Valid Anagram | `Counter` |
| Contains Duplicate | `set` |
| Two Sum | `dict` |

**Mental rule:**
```
Do I need one number, or counts for many different keys?
```

---

## Card 20: Problem Pattern Decision Tree

**What it is:** A quick way to decide what tool/pattern to use.

**Ask these questions in order:**
```
1. Does the problem ask for a new list?
   -> ans = []
2. Does it ask "how many" items match?
   -> count = 0
3. Does it ask for sum/score/total?
   -> total = 0
4. Does it ask for maximum/largest/longest?
   -> best variable
5. Does it say consecutive/in a row?
   -> current + best
6. Does it ask duplicate/seen/unique?
   -> set
7. Does it ask frequency/how many times each?
   -> Counter or freq dict
8. Does it need key -> value lookup?
   -> dict
9. Does it need exact positions in a string/list?
   -> slicing or indexing
```

**Examples:**
```
Concatenation of Array  -> new list
Score of String         -> running total
Length of Last Word     -> split + negative index
Number of Seniors       -> slicing + count
Max Consecutive Ones    -> streak counter
Valid Anagram           -> Counter
Contains Duplicate      -> set
Two Sum                 -> dict mapping
```

---

## Card 21: My Current Weak Spots

Based on the problems I tried, I should practice these patterns:
```
1. Choosing count vs Counter
2. Choosing total vs list
3. Using current + best for consecutive/streak problems
4. Using slicing when positions are fixed
5. Knowing when index loop is needed
6. Knowing when direct loop is enough
7. Understanding that Counter/dict is for frequency per value
8. Understanding that not every "counting" problem needs a dictionary
9. Translating problem words into patterns
```

**Examples from my mistakes:**
```
Number of Senior Citizens:
  I tried frequency, but only needed count + slicing.

Score of a String:
  I tried making a diff list, but only needed running total.

Max Consecutive Ones:
  I tried frequency, but needed current streak + best streak.

Length of Last Word:
  I tried removing spaces, but needed split() to preserve words.
```

**Main reminder:**
```
Data structures are tools.
Patterns tell me which tool to use.
```
