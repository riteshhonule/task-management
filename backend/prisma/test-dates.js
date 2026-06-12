// Simulating the date range generation for Mahendra's leave
const leaveStartDate = "2026-06-04T00:00:00.000Z";
const leaveEndDate = "2026-06-06T23:59:59.000Z";

const startVal = new Date(leaveStartDate);
const endVal = new Date(leaveEndDate);

let current = new Date(
  startVal.getUTCFullYear(),
  startVal.getUTCMonth(),
  startVal.getUTCDate(),
  0, 0, 0, 0
);
const end = new Date(
  endVal.getUTCFullYear(),
  endVal.getUTCMonth(),
  endVal.getUTCDate(),
  0, 0, 0, 0
);

console.log("Start UTC Date:", startVal.getUTCDate());
console.log("End UTC Date:", endVal.getUTCDate());
console.log("Initial current local:", current.toString());
console.log("End local:", end.toString());

const flatTasks = [];

while (current <= end) {
  const dateCopy = new Date(current);
  flatTasks.push({
    id: `leave-${dateCopy.toISOString().split('T')[0]}`,
    startDate: dateCopy.toISOString(),
  });
  current.setDate(current.getDate() + 1);
}

console.log("Pushed tasks startDates:");
flatTasks.forEach(t => {
  const localDate = new Date(t.startDate);
  console.log(`- ISO: ${t.startDate} => local: ${localDate.toString()} => toDateString: ${localDate.toDateString()}`);
});
