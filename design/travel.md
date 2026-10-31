# Getting about (milestone 4e)

Halls are 100 to 225 metres across, and there are thousands of them, so crossing the House one door at a time is no way
to get anywhere. The House's own way of keeping track of itself is the name: a visitor who knows a place's name can walk
there. Everything below is a *real walk*: it takes real time at the visitor's walking speed, and anything that would stop a
walk stops this one.

## Commands
| You type | What happens |
|---|---|
| `travel to the Ninth Vestibule` (also `go to ...`, `visit ...`) | Plans the shortest way through doors, long passages and great stairs, and walks it |
| `travel to the Eighty-Eighth Western Hall` / `... Fifth North-Eastern Hall, 2 rows north` | Any hall by the House's own name, in any case |
| `travel to the first western hall upper` (or `lower`, `middle`) | A place on another level, using the stairs on the way |
| `home` / `return` | The First Vestibule |
| `travel west 40`, or just `travel west` | Straight on through the west doors for 40 halls, or until there is no door that way |
| `mark the fountain`, `marks`, `unmark the fountain` | Remember where you stand under a name of your own; `travel to the fountain` goes back |
| `approach 3` (or `walk to statue 3`) | Walk along the wall to statue number 3 from the list and stop in front of it |
| `stop` | Stops a journey where you are |

## How it behaves
* A journey is a string of ordinary legs. At the real pace each leg takes its real time; you hear the footsteps, the tide,
  the portals and the weather all the way, and what you pass is one line per hall ("You pass through the Fourth Western
  Hall."). At the instant pace (testing) the whole journey happens at once and the lines are joined into one.
* Only the hall where you arrive is described in full.
* If water rises across a door on the way, or the way runs into the Drowned Halls, the journey breaks off at the last hall
  you reached and says so. The route never plans through a Drowned Hall.
* The route is the fewest halls (a stair counts as three, a long passage as the halls it covers), found with A* over the door
  graph (`src/game/travel.ts`).
* You may name any place in the House, not only places you have been: the visitor knows the House by name. Halls passed
  through are added to the map as visited.
* Marks are private: kept in this device's browser storage, per world seed, never shared. In multiplayer they will stay private.
* **Map:** tapping a place on the map offers "Travel to <name>". On a phone this is the main way to go far.

## Not yet
* Searching statues ("find the nearest statue of a weaver"), which would use the catalogue and the generator's palette.
* Tidal timing in route choice (choosing a route that avoids a wet hall until it drains).
* Shared marks between visitors (multiplayer, milestone 8).
