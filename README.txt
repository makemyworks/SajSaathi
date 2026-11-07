SAJSAATHI MAIN - CLEANUP PATCH

This patch removes 20 obsolete Partner-only route/session/component files from the Main repository.
It fixes the current missing imports of @/components/Partner and @/components/BookingCard in app/bookings/*.
It also removes other Main-incompatible Partner dashboard pages and the duplicate root app/page.tsx route.
The Customer homepage and Customer booking pages under app/(customer) are preserved.

HOW TO APPLY (Windows):
1. Extract the contents of this ZIP into the ROOT of your SajSaathi Main repository (the folder with package.json and .git).
2. Double-click APPLY-MAIN-CLEANUP.bat.
3. Review the deleted files in Git, then commit and push to the Main branch.

The script checks that Git can apply the patch before changing files. It does not modify the Partner repository.
