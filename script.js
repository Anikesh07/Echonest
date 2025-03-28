// YouTube Music API integration
const API_KEY = 'AIzaSyCaOa9ijyHYAoJk_f7MegFvgSLSKY4RSyg'; // Replace with your actual API key
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

// Player state
const playerState = {
    currentSong: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 70,
    queue: [],
    currentIndex: -1,
    isShuffle: false,
    isRepeat: false,
    likedSongs: new Set()
};

// DOM elements
const elements = {
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    songList: document.getElementById('song-list'),
    currentAlbumArt: document.getElementById('current-album-art'),
    currentSongTitle: document.getElementById('current-song-title'),
    currentSongArtist: document.getElementById('current-song-artist'),
    playBtn: document.getElementById('play-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    shuffleBtn: document.getElementById('shuffle-btn')}

// Audio context for waveform visualization
let audioContext;
let analyser;
let dataArray;
let animationId;

// Initialize the player
function init() {
    // Event listeners
    elements.searchBtn.addEventListener('click', searchSongs);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchSongs();
    });
    
    elements.playBtn.addEventListener('click', togglePlay);
    elements.prevBtn.addEventListener('click', playPrev);
    elements.nextBtn.addEventListener('click', playNext);
    elements.shuffleBtn.addEventListener('click', toggleShuffle);
    elements.repeatBtn.addEventListener('click', toggleRepeat);
    elements.likeBtn.addEventListener('click', toggleLike);
    elements.progressBar.addEventListener('click', seek);
    elements.volumeSlider.addEventListener('input', setVolume);
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Initialize audio context
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    } catch (e) {
        console.error('Web Audio API not supported', e);
    }
    
    // Load some default songs
    searchSongs('popular songs');
}

// Search for songs using YouTube API
async function searchSongs(query) {
    if (!query) query = elements.searchInput.value;
    if (!query) return;
    
    try {
        const response = await fetch(`${BASE_URL}?part=snippet&maxResults=20&q=${encodeURIComponent(query + " music")}&type=video&key=${API_KEY}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            playerState.queue = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title.replace(/\(.*?\)|\[.*?\]/g, '').trim(),
                artist: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.default.url,
                duration: '3:45' // YouTube API doesn't provide duration in search, would need another API call
            }));
            
            renderSongList(playerState.queue);
            
            // Auto-play first song
            if (playerState.queue.length > 0) {
                playSong(0);
            }
        }
    } catch (error) {
        console.error('Error fetching songs:', error);
        // Fallback to mock data if API fails
        loadMockData();
    }
}

// Play a song
function playSong(index) {
    if (index < 0 || index >= playerState.queue.length) return;
    
    playerState.currentIndex = index;
    playerState.currentSong = playerState.queue[index];
    
    // Highlight current song in list
    const songItems = document.querySelectorAll('.song-item');
    songItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update like button
    elements.likeBtn.classList.toggle('liked', playerState.likedSongs.has(playerState.currentSong.id));
    
    // In a real app, you would load the actual audio here
    // For demo purposes, we'll simulate playback
    simulatePlayback();
    
    // Start visualization
    if (analyser) {
        visualize();
    }
}

// Simulate audio playback (in a real app, you would use the YouTube player API)
function simulatePlayback() {
    // Clear any existing playback simulation
    clearInterval(window.playbackInterval);
    clearInterval(window.timeUpdateInterval);
    
    // Reset progress
    playerState.currentTime = 0;
    elements.progress.style.width = '0%';
    elements.currentTime.textContent = '0:00';
    
    // Parse duration (mock)
    const [mins, secs] = playerState.currentSong.duration.split(':').map(Number);
    playerState.duration = mins * 60 + secs;
    
    if (playerState.isPlaying) {
        // Simulate playback progress
        window.timeUpdateInterval = setInterval(() => {
            playerState.currentTime += 1;
            const progressPercent = (playerState.currentTime / playerState.duration) * 100;
            elements.progress.style.width = `${progressPercent}%`;
            
            // Format time
            const currentMins = Math.floor(playerState.currentTime / 60);
            const currentSecs = Math.floor(playerState.currentTime % 60).toString().padStart(2, '0');
            elements.currentTime.textContent = `${currentMins}:${currentSecs}`;
            
            // End of song
            if (playerState.currentTime >= playerState.duration) {
                if (playerState.isRepeat) {
                    playSong(playerState.currentIndex);
                } else {
                    playNext();
                }
            }
        }, 1000);
    }
}

/