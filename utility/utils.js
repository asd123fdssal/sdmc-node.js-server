
const formatTimestamp = (inputDate) => {
	const date = new Date(inputDate);
	const timestamp = date.toISOString().slice(0, 19).replace("T", " ");
	return timestamp;
}

module.exports = {
	formatTimestamp
}