# Level format

Levels are ASCII maps parsed by `src/game/level/parseLevel.ts`. Nothing is placed
by hand in a scene: a map string is the single source of truth for collisions,
spawns, puzzle links and the exit.

## Tiles

| Char     | Meaning                                                    |
| -------- | ---------------------------------------------------------- |
| `#`      | Solid wall                                                 |
| `-`      | One-way platform (jump through from below, land on top)    |
| `.`      | Empty space                                                |
| `1`      | Player 1 spawn                                             |
| `2`      | Player 2 spawn                                             |
| `X`      | Pushable crate                                             |
| `^`      | Spikes (deadly)                                            |
| `E`      | Exit                                                       |
| `a`–`f`  | Pressure plate, opens doors with the same uppercase letter |
| `A`–`F`  | Door opened by the matching lowercase plate                |
| `s`, `t` | Lever, opens its uppercase door permanently once touched   |
| `S`, `T` | Door opened by the matching lowercase lever                |

## Rules

- A plate is down while a player **or a crate** overlaps it. It is up again the
  moment the weight leaves, so a door can close behind someone.
- A lever latches on the first touch and never turns off. Multiple doors can
  share one link.
- A door is solid while closed. Opening it disables its collision body.
- A level is cleared when **both** players stand in the exit. A captured player
  freezes in place until the level ends.
- Touching spikes or falling off the bottom of the map restarts the level.
- A crate pushed into a pit respawns at its starting tile so a level can never
  become unsolvable.

## Validation

`parseLevel()` throws a readable error instead of producing a broken level. A
map is rejected when:

- rows have different lengths;
- there is not exactly one `1` and one `2`;
- there is no `E`;
- a character is not in the table above;
- a door has no matching plate/lever, or a plate/lever has no matching door.

Unit tests in `tests/parseLevel.test.ts` cover these cases, and
`tests/levels.test.ts` checks every shipped level is rectangular, 17 rows tall,
and internally consistent.

## Adding a level

1. Add an entry to `LEVELS` in `src/game/level/levels.ts`:

   ```ts
   {
     id: 'level-6',
     name: 'Short Name',
     hint: 'One sentence shown in the HUD at the start.',
     map: [
       '##############################',
       // ... 17 rows total, all the same width ...
       '##############################',
     ],
   }
   ```

2. Keep the outer border solid and leave a floor row under both spawns.
3. Run `npm test` — the level is parsed and validated automatically.
4. Run `npm run dev` and play it from **Level select**; new levels unlock in
   order, so clear the previous level or reset progress while playtesting.

## Example

```text
##############################
#..............#.............#
#..............#.............#
#.1.2.a........A....a....E...#
##############################
```

P1 stands on the left plate `a` so P2 can walk through door `A`. P2 then holds
the right plate, letting P1 through. Both head to the exit. Add height, gaps and
a crate when the basic route works.
