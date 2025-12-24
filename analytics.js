const Analytics = (() => {

    const OWNER = "ali73jn";
    const REPO = "bookmark-analytics";
    const TOKEN = "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";

    function getDeviceId() {
        let id = localStorage.getItem("device_id");
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem("device_id", id);
        }
        return id;
    }

    function getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    async function getOrCreateIssue(headers, title) {
        const res = await fetch(
            `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open`,
            { headers }
        );
        const issues = await res.json();
        let issue = issues.find(i => i.title === title);

        if (!issue) {
            const create = await fetch(
                `https://api.github.com/repos/${OWNER}/${REPO}/issues`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        title,
                        body: "Daily online device visits"
                    })
                }
            );
            issue = await create.json();
        }

        return issue;
    }

    async function reportOnlineVisit() {
        if (!navigator.onLine) return;

        const headers = {
            "Authorization": `Bearer ${TOKEN}`,
            "Accept": "application/vnd.github+json"
        };

        const deviceId = getDeviceId();
        const today = getTodayKey();
        const issueTitle = `visits-${today}`;

        try {
            const issue = await getOrCreateIssue(headers, issueTitle);

            const commentsRes = await fetch(issue.comments_url, { headers });
            const comments = await commentsRes.json();

            if (comments.some(c => c.body === deviceId)) return;

            await fetch(issue.comments_url, {
                method: "POST",
                headers,
                body: JSON.stringify({ body: deviceId })
            });

        } catch (e) {
            console.warn("Analytics failed");
        }
    }

    async function getTodayCount() {
        if (!navigator.onLine) return 0;

        try {
            const res = await fetch(
                `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open`,
                { headers: { "Accept": "application/vnd.github+json" } }
            );
            const issues = await res.json();
            const issue = issues.find(i => i.title === `visits-${getTodayKey()}`);
            return issue ? issue.comments : 0;
        } catch {
            return 0;
        }
    }

    return {
        reportOnlineVisit,
        getTodayCount
    };

})();
