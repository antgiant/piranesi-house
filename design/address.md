# The address bar and the room (milestone 4h)

The fragment (the part of the web address after `#`) names where you are, so copying the address and sending it takes
someone straight to the same hall.

* `#room=Third+Western+Hall` the hall, by the name the House gives it (the same names as `travel to`).
* `&level=upper` or `lower`, only when you are not on the middle level.
* `&seed=...`, only when the world is not the usual one. A link that names a room but no world means the usual world, whatever the
  recipient's own settings say.
* Anything else in the fragment (the developer overrides such as `pace`, `scale`, `at`) is left alone.

## Behaviour
* The address is updated whenever you arrive somewhere new, with `history.replaceState`, so walking never fills the back
  button with history.
* Opening a link starts the House as usual (the title screen and the click that allows sound are still needed) and then puts
  you in the named hall; the log says "You arrive where the link you were sent leads."
* Changing the fragment while playing (pasting another address into the same tab, following a link) takes you there; if it
  names a different world the page reloads into it.
* A name we do not know is ignored and you start in the First Vestibule.
* Changing the seed or restarting in Settings starts at the First Vestibule again and clears the room (and a replaced
  seed) from the address.

## What a link does not carry
Only the room. Not the time (the tides and weather follow the real clock for whoever opens it), not your found list or marks
(private to your browser), not the narration or settings. Position within the hall is the middle of the floor.
