Step 1: Phone ko USB se connect karo, unlock rakho aur WSL terminal mein chalao:

/mnt/c/Android/platform-tools/adb.exe devices

Output:
kumarpc@YogeshPC:~/projects/my-saas$ /mnt/c/Android/platform-tools/adb.exe devices
* daemon not running; starting now at tcp:5037
* daemon started successfully
List of devices attached
10BDB62ZN3000P0 device

Ab next step: WSL terminal mein ye teen commands chalao:

/mnt/c/Android/platform-tools/adb.exe -s 10BDB62ZN3000P0 reverse tcp:8000 tcp:8000
/mnt/c/Android/platform-tools/adb.exe -s 10BDB62ZN3000P0 reverse tcp:3000 tcp:3000
/mnt/c/Android/platform-tools/adb.exe -s 10BDB62ZN3000P0 reverse tcp:8081 tcp:8081

iska output should be this:
8000
3000
8081

Next step: Docker services start karo:

cd /home/kumarpc/projects/my-saas/backend
docker compose up -d

Next step: Backend start karo:

cd /home/kumarpc/projects/my-saas/backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Next step: Ek naya WSL terminal kholo aur frontend start karo:

cd /home/kumarpc/projects/my-saas/frontend
pnpm dev:android


Next step: Ek aur naya WSL terminal kholo aur Metro start karo:

cd /home/kumarpc/projects/my-saas/android-app
pnpm start:usb

Ab phone mein android-app kholo.

Development Build screen aaye to URL field mein ye daalo aur Connect dabao:

http://127.0.0.1:8081