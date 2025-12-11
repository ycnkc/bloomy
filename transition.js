document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        document.body.classList.add("fade-in");
    }, 100);

    const links = document.querySelectorAll('a');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetUrl = link.href;

            if (targetUrl.includes('#') || targetUrl === window.location.href) return;

            e.preventDefault();

            document.body.classList.remove("fade-in");

            setTimeout(() => {
                window.location.href = targetUrl; 
            }, 500);
        });
    });
});