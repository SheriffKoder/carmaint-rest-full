
import { NextFunction, Request, Response } from "express";
const {validationResult} = require("express-validator");
import CarModel, { CarDocument } from "../models/carModel";
import UserModel from "../models/userModel";

// (req: Request, res:Response, next: NextFunction)

const today = new Date();
const thisMonth = today.getMonth()+1;

const todayString = today.getFullYear() + "-" + thisMonth + "-" + today.getDate();

// make months and days less than 10 to be stored with a 0 before
// to be displayed in the date forms on the front end
// as this completedOn, addedOn dates are API generated not front-end form generated
let fixedDate = "";
todayString.split("-").forEach((number, index)=> {
    if (index === 1 || index === 2) {
        (Number(number) < 10) ?  fixedDate = fixedDate+"-0"+number : fixedDate = fixedDate+"-"+number;
    } else if (index === 0) {
        fixedDate = fixedDate+number;
    }
})



import { clearImage } from "../util/clearImage";

//API 0.2 - user model car object
interface Request_With_UserId extends Request {
    userId: string,
}

//API 0.2 - authentication
//API 0.2 - images


const routeValidationErrors = (req:Request, res:Response) => {
    ////////////////////////////////////////////////////////////////
    //get the validation errors array
    //an array of objects with path, msg
    const routeValidationErrors = validationResult(req).errors;
    // console.log(routeValidationErrors);
    //if there is an error, return back to the FE a response

    if (routeValidationErrors.length > 0) {
        //i want to go over each object in the array
        //for each object return its msg as message
        const errors = routeValidationErrors.map((errorObject:any) => {
            return {
                message: errorObject.msg
            }
        });
        console.log(errors);
        return errors;
    } else {
        return false;
    }
    ////////////////////////////////////////////////////////////////

};


exports.addCar = async (req: Request_With_UserId, res:Response, next: NextFunction) => {


    ////////////////////////////////////////////////////////////////
    const errors = routeValidationErrors(req,res);
    if (errors) return res.status(422).json(errors);
    ////////////////////////////////////////////////////////////////


    //create a car if no errors
    try {

        const {brand, carModel, userId, image} = req.body;
        console.log(req.body);
        console.log(req.file);
        // console.log(name);

        let imageUrl = image;
        if (req.file) {
            imageUrl = "/"+req.file.path
        }
        
        // console.log(encryptedPassword);
    
        const newCar = await new CarModel({
            brand: brand,
            carModel: carModel,
            userId: userId,
            // API 0.2 - images
            //the path is generated by multer as it was stored on the server
            image: imageUrl,
        });
    
        await newCar.save();

        //API 0.2 - user model car object
        //the req is already given the userId in the isAuth middleware when 
        //passing a successful request on the route before accessing this middleware
        const user = await UserModel.findById(req.userId);
        if (user) {
            user.cars.push(newCar);
            await user.save();
        }


        // return res.status(201).json(newCar);

        return res.status(200).json(user?.cars[0]);


    
    } catch (error) {
        return res.status(500).json("Failed to create a new Car");

    }


}

exports.editCar = async (req: Request_With_UserId, res:Response, next: NextFunction) => {


    ////////////////////////////////////////////////////////////////
    const errors = routeValidationErrors(req,res);
    if (errors) return res.status(422).json(errors);
    ////////////////////////////////////////////////////////////////


    //find and edit car if no errors
    try {

        const {brand, carModel, userId, _id, image} = req.body;
        console.log(req.body._id);
        // console.log(name);
        
        const currentCar = await CarModel.findById(_id);



        if (currentCar) {

            // console.log(req.userId);
            // console.log(currentCar.userId);
            //API 0.2 - authentication
            //check the ownership of the currently logged in user accessing this middleware
            //the req.userId is set when accessing isAuth checker
            //which is taken from the token created on login
            if (currentCar.userId.toString() !== req.userId.toString()) {
                return res.status(403).json("Not Authorized");
            }




            currentCar.brand = brand;
            currentCar.carModel = carModel;

            //API 0.2 - images
            // if there is a file in the request given by multer
            const oldImage = currentCar.image;
            if (req.file) {
                currentCar.image = "/"+req.file.path
            }

            await currentCar.save();

            if (oldImage !== currentCar.image) {
                clearImage(oldImage);
            }

            return res.status(201).json(currentCar);

        } else {
            return res.status(404).json("Car not found");

        }

        

    
    } catch (error) {
        return res.status(500).json("Failed to edit the Car");

    }


}

exports.deleteCar = async (req: Request_With_UserId, res:Response, next: NextFunction) => {


    //find and edit car if no errors
    try {

        const {_id} = req.body;
        console.log(req.body);
        // console.log(name);
        
        const currentCar = await CarModel.findById(_id);

        if (!currentCar) {
            return res.status(404).json("Car not found to be deleted");
        } else {


            if (currentCar.userId.toString() !== req.userId.toString()) {
                return res.status(403).json("Not Authorized");
            }

            //API 0.2 - images
            //remove the image file
            clearImage(currentCar.image);

            //remove the car from the DB
            await CarModel.findByIdAndDelete(_id);

            //API 0.2 - user's car object model
            //remove the car from the user's cars
            const user = await UserModel.findById(req.userId);
            if (user) {
                // user?.cars.pull(_id);    //pull does not exist on user.cars ?
                user.cars = user.cars.filter((car) => car.toString() !== _id );
                user.save();
            }



            return res.status(201).json("Car deleted successfully");

        }


    
    } catch (error) {
        return res.status(500).json("Failed to delete the Car");

    }


}



//car checks
//this is a new check that will add to the car model a new "check object"
//with the first history-check in it
exports.newCheck = async (req: Request, res:Response, next: NextFunction) => {


    ////////////////////////////////////////////////////////////////
    const errors = routeValidationErrors(req,res);
    if (errors) return res.status(422).json(errors);
    ////////////////////////////////////////////////////////////////

    console.log(req.body);

    //find and edit car if no errors
    try {

        const {title, color, initialCheck, nextCheck, notes, carId} = req.body;
        // // console.log(req.body._id);
        // // console.log(name);
        
        const currentCar = await CarModel.findById(carId);

        if (currentCar) {

                //add the check base
                //add first history item
                currentCar.checks.push({
                    name: title as string,
                    color: color as string,
                    history: [{
                        addDate: fixedDate,
                        initialCheck: initialCheck,
                        nextCheck: nextCheck,
                        checkedOn: "",
                        notes: notes,
                    }],
                })

            await currentCar.save();
            return res.status(201).json(currentCar);


        } else {
            return res.status(404).json("Car not found");

        }

        

    
    } catch (error) {
        return res.status(500).json("Failed to edit the Car");

    }


}


exports.editCheck = async (req: Request, res:Response, next: NextFunction) => {


    ////////////////////////////////////////////////////////////////
    const errors = routeValidationErrors(req,res);
    if (errors) return res.status(422).json(errors);
    ////////////////////////////////////////////////////////////////

    console.log(req.body);

    //find and edit car if no errors
    try {

        const {title, color, initialCheck, nextCheck, notes, carId, checkIndex, historyIndex, checkedOn} = req.body;
        console.log(req.body);
        // // console.log(name);
        
        const currentCar = await CarModel.findById(carId);

        if (currentCar) {

                // let currentCar = originalCar;

                //add the check base
                //modify the currentCar base info and keep the history
                currentCar.checks[+checkIndex]={
                    name: title as string,
                    color: color as string,
                    history: currentCar.checks[+checkIndex].history,
                }

                //modify the currentCar's history
                currentCar.checks[+checkIndex].history[+historyIndex] = {
                    addDate: currentCar.checks[+checkIndex].history[+historyIndex].addDate,
                    checkedOn: checkedOn,
                    initialCheck: initialCheck,
                    nextCheck: nextCheck,
                    notes: notes,
                }

            await currentCar.save();
            return res.status(201).json(currentCar);


        } else {
            return res.status(404).json("the car to be edited was not found");

        }

        

    
    } catch (error) {
        return res.status(500).json("Failed to edit the check");

    }


}


exports.deleteCheck = async (req: Request, res:Response, next: NextFunction) => {


    ////////////////////////////////////////////////////////////////
    const errors = routeValidationErrors(req,res);
    if (errors) return res.status(422).json(errors);
    ////////////////////////////////////////////////////////////////

    console.log(req.body);

    //find and edit car if no errors
    try {

        const {carId, checkIndex} = req.body;
        console.log(req.body);
        // // console.log(name);
        
        const currentCar = await CarModel.findById(carId);

        if (currentCar) {

            //filter out the check matching this index
            currentCar.checks = currentCar.checks.filter((check)=> check !== currentCar.checks[+checkIndex])


            await currentCar.save();
            return res.status(201).json(currentCar);

        } else {
            return res.status(404).json("the car to be edited was not found");

        }

        

    
    } catch (error) {
        return res.status(500).json("Failed to edit the check");

    }


}

exports.completeCheck = async (req: Request, res:Response, next: NextFunction) => {


    ////////////////////////////////////////////////////////////////
    const errors = routeValidationErrors(req,res);
    if (errors) return res.status(422).json(errors);
    ////////////////////////////////////////////////////////////////

    console.log(req.body);

    //find and edit car if no errors
    try {

        const {carId, checkIndex} = req.body;
        
        let currentCar = await CarModel.findById(carId);

        if (currentCar) {

            let tempCar = currentCar;
            // console.log(currentCar.checks[checkIndex].history);
                //add the check base
                //modify the currentCar base info and keep the history
                tempCar.checks[+checkIndex].history[0].checkedOn = fixedDate;

            // console.log(currentCar.checks[checkIndex].history);

            tempCar.checks[+checkIndex].history.unshift({
                addDate: fixedDate,
                checkedOn: "",
                initialCheck: "",
                nextCheck: "",
                notes: "",
            })

            console.log(tempCar.checks[+checkIndex].history);

            currentCar.checks = tempCar.checks;

            //modifying the car sub elements did allow saving the new info
            //to overcome this i used two ideas to help
            //markModified does tell mongoose what has been changed
            //also copying the whole object and not editing the sub elements directly
            currentCar.markModified("checks");
            const saved = await currentCar.save();
            return res.status(201).json(saved);


        } else {
            return res.status(404).json("the car to be edited was not found");

        }

        

    
    } catch (error) {
        return res.status(500).json("Failed to complete the check");

    }


}

exports.deleteCheckHistoryItem = async (req: Request, res:Response, next: NextFunction) => {


    ////////////////////////////////////////////////////////////////
    const errors = routeValidationErrors(req,res);
    if (errors) return res.status(422).json(errors);
    ////////////////////////////////////////////////////////////////

    console.log(req.body);
    // arId, checkIndex, historyIndex

    //find and edit car if no errors
    try {

        const {carId, checkIndex, historyIndex} = req.body;
        console.log(req.body);
        // // console.log(name);
        
        const currentCar = await CarModel.findById(carId);

        if (currentCar) {

            //filter out the check history item matching this index from the history
            currentCar.checks[+checkIndex].history = currentCar.checks[+checkIndex].history.filter((checkItem)=> checkItem !== currentCar.checks[+checkIndex].history[historyIndex])

            currentCar.markModified("checks");

            await currentCar.save();
            return res.status(201).json(currentCar);

        } else {
            return res.status(404).json("the car to be edited was not found");

        }

        

    
    } catch (error) {
        return res.status(500).json("Failed to edit the check");

    }


}

