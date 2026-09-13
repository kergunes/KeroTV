# KeroTV V1 physical-TV checklist

Target: Sony KD-55XF7077 on the same LAN as the PC.

1. Run `python server.py` and open the printed `http://PC-IP:8000` URL on the TV.
2. Confirm Home shows the featured area plus Movies and Series rows without edge clipping.
3. Using only the remote, move in every direction. Confirm the orange focus ring moves one item at a time.
4. Press OK on a focused card. Confirm Detail opens with the matching title and metadata.
5. Press OK on **Play now**. Confirm the local MP4 loads and begins playing; test pause/seek with the TV controls if exposed.
6. Press Back/Return. Confirm Player → Detail, then Back again for Detail → Home.
7. From Detail, return Home and reopen a different card. Confirm the selected title stays correct.
8. Move the pointer away from the focused card, press remote OK, and confirm the focused card opens (not the pointer location).
9. From Home, press Back once and confirm the guarded exit hint; do not press again unless you intentionally want to leave the page.

Desktop keyboard smoke test: arrows move focus, Enter selects, and Escape/Backspace follows the same stack. This checklist is the required manual validation; desktop success is not evidence of Sony hardware playback.
