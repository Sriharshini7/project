let cameraStream;
let arStream;

// === Open gallery input ===
function openGallery() {
    document.getElementById('galleryInput').click();
}

// === Open camera ===
function openCamera() {
    const video = document.getElementById('cameraFeed');
    const captureBtn = document.getElementById('captureBtn');

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            cameraStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            captureBtn.style.display = 'inline-block';

            // Smooth animation
            video.classList.add("fade-in");
        })
        .catch(err => {
            alert("⚠️ Could not access camera: " + err);
        });
}

// === Capture image and send to backend ===
function captureImage() {
    const video = document.getElementById('cameraFeed');
    const uploading = document.getElementById('upload-status');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(function(blob) {
        const formData = new FormData();
        formData.append('file', blob, 'capture.jpg');
        if (uploading) uploading.style.display = 'block';
        fetch('/predict', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text()) // server returns HTML
            .then(html => {
                document.open();
                document.write(html);
                document.close();
            })
            .catch(err => console.error("❌ Upload error:", err));
    }, 'image/jpeg');

    // Stop camera feed
    video.srcObject.getTracks().forEach(track => track.stop());
    video.style.display = 'none';
    document.getElementById('captureBtn').style.display = 'none';
}

// Convert common YouTube URLs to embeddable form
function youtubeToEmbed(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.replace('www.', '');
        let id = null;
        if (host === 'youtu.be') {
            id = u.pathname.slice(1);
        } else if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (u.pathname === '/watch') {
                id = u.searchParams.get('v');
            } else if (u.pathname.startsWith('/shorts/')) {
                id = u.pathname.split('/')[2];
            } else if (u.pathname.startsWith('/embed/')) {
                id = u.pathname.split('/')[2];
            }
        }
        if (!id) return url; // fallback
        return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
    } catch (e) {
        return url;
    }
}

// === Show site info on AR page ===
function showInfo(type) {
    const infoBox = document.getElementById('info-box');
    if (!window.siteData) {
        infoBox.innerText = "⚠️ No data available.";
        return;
    }

    infoBox.style.opacity = 0; // smooth fade-out
    setTimeout(() => {
        if (type === 'video') {
            const embedSrc = youtubeToEmbed(window.siteData[type]);
            infoBox.innerHTML = `
                <div class="video-container">
                    <iframe width="100%" height="315" 
                        src="${embedSrc}" 
                        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                </div>`;
        } else {
            infoBox.innerHTML = `<p>${window.siteData[type] || "ℹ️ Information not available."}</p>`;
        }
        infoBox.style.opacity = 1; // fade-in
    }, 200);
}

// === AR Mode: start camera behind overlay ===
function startAR() {
    const video = document.getElementById('arCamera');
    if (!video) return; // Only on AR page

    const constraints = { video: { facingMode: 'environment' } };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            arStream = stream;
            video.srcObject = stream;
        })
        .catch(err => {
            console.error('AR camera error:', err);
            // Fallback to front camera if environment not available
            return navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    arStream = stream;
                    video.srcObject = stream;
                })
                .catch(err2 => {
                    alert('Could not start AR camera: ' + err2);
                });
        });
}

function stopAR() {
    if (arStream) {
        arStream.getTracks().forEach(t => t.stop());
        arStream = null;
    }
    const video = document.getElementById('arCamera');
    if (video) {
        video.srcObject = null;
    }
}
// Handle gallery upload
function handleGalleryUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const uploading = document.getElementById('upload-status');
    const formData = new FormData();
    formData.append("file", file);

    fetch("/predict", {
            method: "POST",
            body: formData
        })
        .then(response => response.text()) // Flask returns the full HTML page
        .then(html => {
            document.open();
            document.write(html);
            document.close();
        })
        .catch(err => console.error("Upload error:", err));
}
// Go Back to home page
function goBack() {
    window.location.href = "/";
}