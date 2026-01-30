// seed.js
const feedbacks = [
  // 🚨 Security Issues
  { source: "email", message: "I found a way to bypass the login screen by changing the URL parameters. Urgent fix needed." },
  { source: "ticket", message: "My password reset link sent me to a suspicious HTTP page, not HTTPS." },
  { source: "twitter", message: "Is your database leaked? I saw my email on a hacker forum." },

  // 🐛 Bugs
  { source: "app", message: "The submit button is greyed out on the settings page." },
  { source: "email", message: "App crashes every time I try to upload a profile picture." },
  { source: "ticket", message: "Dark mode is broken, the text is black on a black background." },

  // 💡 Features
  { source: "twitter", message: "Please add a way to export my data to CSV!" },
  { source: "app", message: "I would love a mobile app version of this dashboard." },
  { source: "survey", message: "Can you integrate with Slack notifications?" },

  // ❤️ Positive
  { source: "twitter", message: "This is the best tool I have used all year. Great job team!" }
];

async function seed() {
  console.log("🌱 Seeding 10 feedback entries...");

  for (const [index, item] of feedbacks.entries()) {
    try {
      // Send to your local worker
      const response = await fetch("https://feedback-digestive-system.v8i0qco63-99a.workers.dev/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });

      if (response.ok) {
        console.log(`[${index + 1}/10] ✅ Sent: "${item.message.substring(0, 30)}..."`);
      } else {
        console.log(`[${index + 1}/10] ❌ Failed: ${response.statusText}`);
      }

      // Wait 1 second between requests to be nice to the AI rate limits
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error("Error sending feedback:", error);
    }
  }

  console.log("🎉 Seeding complete! Check your Worker logs.");
}

seed();