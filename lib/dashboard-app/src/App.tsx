import React, { useState } from 'react';
import './App.css';
import 'bulma/css/bulma.min.css';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    }
  }
};

interface ChartDataset {
  readonly label: string;
  readonly data: number[];
  readonly backgroundColor: string;
}

interface ChartData {
  readonly labels: string[];
  readonly datasets: ChartDataset[];
}

export interface CustomerAggregateRevenue {
  readonly name: string;
  readonly revenue: number;
}

export interface AggregateRevenue {
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly totalRevenue: number;
  readonly customerRevenue: CustomerAggregateRevenue[];
}

function randomInt(low: number, high: number) {
  return Math.floor(Math.random() * (high - low) + low);
}


function initialDataset(label: string, revenue: number) {
  const r = randomInt(0, 255);
  const g = randomInt(0, 255);
  const b = randomInt(0, 255);
  return {
    label: label,
    data: [ Number(revenue.toFixed(0)) ],
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.5)`
  };
}

const customers = ["Wayne Enterprises", "Hooli Corp", "Mystery Inc", "Acme Corp"];

function App() {
  const [chartState, setChartState] = useState<ChartData>({
    labels: [""],
    datasets: customers.map(c => initialDataset(c, 0))
  });

  const [barchartState, setBarChartState] = useState<ChartData>({
    labels: customers,
    datasets: [{
      label: "Total Customer Revenue",
      data: customers.map(c => 0),
      backgroundColor: 'lightblue'
    }]
  });

  const apiUrl = new URL(window.location.href).searchParams.get("apiUrl");

  const socket = new WebSocket(apiUrl!);
  socket.addEventListener("message", (evt) => {
    const update: AggregateRevenue = JSON.parse(evt.data);
    console.log(`Received update ${JSON.stringify(update)}`)
    const time = new Date(update?.windowEnd!).toLocaleTimeString();
    if (!chartState.labels.includes(time)) {
      chartState.labels.push(time);

      for (const custRev of update?.customerRevenue!) {
        let i = chartState.datasets.findIndex(c => c.label === custRev.name)!;
        chartState.datasets[i].data.push(custRev?.revenue!);

        let j = barchartState.labels.findIndex(l => l === custRev.name);
        barchartState.datasets[0].data[j] += custRev?.revenue!;
      }
  
      setChartState({ ...chartState, datasets: [ ...chartState.datasets ] });

      setBarChartState({
        ...barchartState,
        datasets: [
          ...barchartState.datasets
        ]
      })
    }
  })

  return (
    <div className="App">
      <header className="center-text">
        <h2 className='pl-2'>Customer Revenue</h2>
      </header>
      <div className="is-flex is-justify-content-center">
        <div className='chart-container'>
          <Line options={options} data={chartState}/>
        </div>
      </div>
      <div className="is-flex is-justify-content-center">
        <div className='chart-container'>
          <Bar data={barchartState}/>
        </div>
      </div>
    </div>
  );
}

export default App;
