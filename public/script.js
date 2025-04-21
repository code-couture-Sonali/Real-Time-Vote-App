const socket = new WebSocket('ws://localhost:8080');
const voteOptionsDiv = document.getElementById('vote-options');
const statusDiv = document.getElementById('status');
const ctx = document.getElementById('voteChart').getContext('2d');

let hasVoted = false;
let chart;

// Initialize Chart.js bar chart
function initializeChart(options, voteData) {
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: options,
      datasets: [{
        label: 'Votes',
        data: options.map(opt => voteData[opt]),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          // Add more colors if needed
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1 // Ensure whole numbers for vote counts
          }
        }
      },
      plugins: {
        legend: {
          display: false // Hide legend since it's clear from labels
        }
      }
    }
  });
}

// Update chart with new vote data
function updateChart(voteData) {
  chart.data.datasets[0].data = chart.data.labels.map(label => voteData[label]);
  chart.update();
}

socket.onopen = () => {
  console.log('Connected to server');
  statusDiv.textContent = 'Connected. Waiting for options...';
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'init') {
    // Render voting options
    voteOptionsDiv.innerHTML = '';
    data.options.forEach(option => {
      const div = document.createElement('div');
      div.className = 'option';
      div.innerHTML = `
        <span>${option}: ${data.votes[option]} votes</span>
        <button ${data.hasVoted ? 'disabled' : ''}>Vote</button>
      `;
      div.querySelector('button').onclick = () => {
        socket.send(JSON.stringify({ type: 'vote', option }));
      };
      voteOptionsDiv.appendChild(div);
    });

    // Initialize chart
    initializeChart(data.options, data.votes);
    hasVoted = data.hasVoted;
    statusDiv.textContent = hasVoted ? 'You have voted!' : 'Choose an option to vote.';
  } else if (data.type === 'update') {
    // Update voting options
    voteOptionsDiv.innerHTML = '';
    data.options.forEach(option => {
      const div = document.createElement('div');
      div.className = 'option';
      div.innerHTML = `
        <span>${option}: ${data.votes[option]} votes</span>
        <button ${data.hasVoted ? 'disabled' : ''}>Vote</button>
      `;
      div.querySelector('button').onclick = () => {
        socket.send(JSON.stringify({ type: 'vote', option }));
      };
      voteOptionsDiv.appendChild(div);
    });

    // Update chart
    updateChart(data.votes);
    hasVoted = data.hasVoted;
    statusDiv.textContent = hasVoted ? 'You have voted!' : 'Choose an option to vote.';
  }
};

socket.onclose = () => {
  statusDiv.textContent = 'Disconnected from server.';
  console.log('Disconnected from server');
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
  statusDiv.textContent = 'An error occurred.';
};