import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// Global plugin to enable pagination for all shards
mongoose.plugin(mongoosePaginate);

export { mongoose };
export default mongoose;