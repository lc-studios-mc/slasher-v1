export const getEnvRequired = (key: string): string => {
	const value = process.env[key];
	if (value === undefined)
		throw new Error(`The environment variable '${key}' is required but not set`);
	return value;
};

export const parseVersionString = (value: string): number[] => {
	const parts = value.split(".");
	if (parts.length !== 3) {
		throw new Error(
			'Version string must contain exactly three integer parts separated by dots (e.g., "1.2.3")',
		);
	}

	const numbers = parts.map((part) => {
		const num = Number(part);
		if (part.trim() === "" || !Number.isInteger(num)) {
			throw new Error(`The segment "${part}" is not a valid integer`);
		}
		return num;
	});
	return numbers;
};
