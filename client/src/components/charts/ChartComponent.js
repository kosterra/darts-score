import React from 'react';
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Pie,
  PieChart,
  Cell
} from 'recharts';

const ChartComponent = props => {
  const {data} = props;

  const COLORS = ['#528b6e', '#d95652'];

  if(props.chartType === 'lineChart') {
    return (
      <LineChart
        width={750}
        height={450}
        data={data}
        margin={{
          top: 20, right: 20, left: 20, bottom: 20,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{stroke: '#fff', strokeWidth: 1}} label={{ value: 'Match Number', fill: '#fff', offset: -15, position: "insideBottom" }}></XAxis> 
        <YAxis tick={{stroke: '#fff', strokeWidth: 1}}/>
        <Tooltip contentStyle={{ backgroundColor: '#565656a6' }} itemStyle={{ color: '#565656a6' }} />
        <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    );
  }

  if(props.chartType === 'pieChart') {
    const RADIAN = Math.PI / 180;                    
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
     const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x  = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy  + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} 	dominantBaseline="central">
          {`${(percent * 100).toFixed(0)}% ` + data[index].name}
        </text>
      );
    };


    return (
      <PieChart width={400} height={400}>
        <Pie dataKey="value"  data={data} cx={200} cy={200} labelLine={false} outerRadius={140} label={renderCustomizedLabel}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie> 
        <Tooltip />
      </PieChart>
    );
  }

}

export default ChartComponent

