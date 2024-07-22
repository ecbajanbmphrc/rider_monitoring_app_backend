const { S3Client, PutObjectCommand} = require("@aws-sdk/client-s3");

const s3Client = new S3Client( 
   {
        region: process.env.region,
        credentials:{
           accessKeyId : process.env.aws_access_key_id,
           secretAccessKey : process.env.aws_secret_access_key   
        }
       
   });


// exports.s3UploadFile = async (file) => {
//    const s3 = new S3();
//    const dateNow =  Date.parse(new Date());
   
//    if (!Array.isArray(file)){
//          const param = {
//             Bucket: 'rmaimage',
//             Key:  "receipt/"+"id?/" +"user1"+ "/" + "r"+dateNow + "1"+".jpg",
//             Body:  Buffer.from(file,  'base64')
//          }
//       return await s3.upload(param).promise();
//    }else{
//          const params = file.map(function(value, index){ 
       
//             return{
//                Bucket: 'rmaimage',
//                Key: "receipt/"+"id?/" +"user1"+ "/" + "r"+dateNow + index +".jpg",
//                Body:  Buffer.from(value,  'base64')
//             }
//          });
//          return await Promise.all(
//             params.map((param) => s3.upload(param).promise())
//          )
         
//    }

// };

exports.s3UploadReceipt = async (file) => {

   const dateNow =  Date.parse(new Date());

   const url = [];
   
   if (!Array.isArray(file.receipt)){
         const param = {
            Bucket: 'rmaimage',
            Key:  `receipt/id/${file.user}/r${dateNow}0.jpg`,
            Body:  Buffer.from(file.receipt,  'base64')
         }
         const data = await s3Client.send(new PutObjectCommand(param));
         url.push(`https://rmaimage.s3.ap-southeast-2.amazonaws.com/receipt/id/${file.user}/r${dateNow}0.jpg`)
         return {url : url, statusCode : data.$metadata.httpStatusCode}
   }else{
         const params = file.receipt.map(function(value, index){ 
            
            url.push(`https://rmaimage.s3.ap-southeast-2.amazonaws.com/receipt/id/${file.user}/r${dateNow}${index}.jpg`)

            return{
               Bucket: 'rmaimage',
               Key: `receipt/id/${file.user}/r${dateNow}${index}.jpg`,
               Body:  Buffer.from(value,  'base64')
            }
           
         });

        const data = await Promise.all(
            params.map((param) => s3Client.send(new PutObjectCommand(param)))
         )

     
         return {url : url, statusCode: data[0].$metadata.httpStatusCode}

         
     
   }

};


exports.s3UploadScreenshot = async (file) => {
         const dateNow =  Date.parse(new Date());
         const param = {
            Bucket: 'rmaimage',
            Key:  `screenshot/id/${file.user}/s${dateNow}0.jpg`,
            Body:  Buffer.from(file.screenshot,  'base64')
         }
         const data = await s3Client.send(new PutObjectCommand(param));
         const url = `https://rmaimage.s3.ap-southeast-2.amazonaws.com/screenshot/id/${file.user}/s${dateNow}0.jpg`
         return {url : url, statusCode : data.$metadata.httpStatusCode}
};



