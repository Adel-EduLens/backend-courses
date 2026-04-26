/**
 * Converts a duration string (e.g., "1m", "2h", "3d", "1w") into milliseconds.
 * @param durationStr - The duration string to parse.
 * @returns The duration in milliseconds.
 */
const parseDuration = (durationStr: string): number => {
   const regex = /^(\d+)([mhdw])$/;
   const match = durationStr.match(regex);

   if (!match) throw new Error("Invalid duration format. Use e.g., '15m', '2h', '1d', '1w'");

   const value = parseInt(match[1] as string, 10);
   const unit = match[2];

   switch (unit) {
      case "m":
         return value * 60 * 1000;
      case "h":
         return value * 60 * 60 * 1000;
      case "d":
         return value * 24 * 60 * 60 * 1000;
      case "w":
         return value * 7 * 24 * 60 * 60 * 1000;
      default:
         throw new Error("Unsupported unit. Use 'm', 'h', 'd', or 'w'");
   }
};

export default parseDuration;
