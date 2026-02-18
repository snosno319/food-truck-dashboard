/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
    const [trucksRes, scheduleRes] = await Promise.all([
        fetch('/data/trucks.json'),
        fetch('/data/schedule.json')
    ]);
    const trucksData = await trucksRes.json();
    const scheduleData = await scheduleRes.json();
    return {
        schedule: {
            last_updated: scheduleData.last_updated,
            venues: trucksData.venues,
            trucks: trucksData.trucks,
            schedule: scheduleData.schedule
        }
    };
}
