import {asyncHandler} from '../utils/asyncHandler.js';    
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOncloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt, { decode } from 'jsonwebtoken'


const generateAccessAndRefreshTokens = async(userId) => {
    try {
       const user =  await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})

       return {accessToken, refreshToken}


    }catch (error){
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}

    const registerUser = asyncHandler(async(req, res) => {
       // console.log("FILES:", req.files); to print in terminal
    const {fullName, email, username, password} = req.body
   // console.log("email :", email);

    // if (fullName == "") {
    //     throw new ApiError(400, "fullname is required")

    // }

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

      const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser) {
    throw new ApiError(409, "user with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    //const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    let coverImageLocalPath;
    if(req.file && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath){
        throw new ApiError(400, "Avatar file required")
    }

    const avatar = await uploadOncloudinary(avatarLocalPath)
    const coverImage = await uploadOncloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Avatar file required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )


    })

    const loginUser = asyncHandler(async (req, res) => {
        //req body -> data
        //username or email
        //find the user
        //password check
        //access and refresh token
        //send cookie

        const {email, username, password} = req.body
        if (!username && !email) {
            throw new ApiError(400, "username or email is required")
        }


       const user = await User.findOne({
            $or: [{username}, {email}]
        })

        if (!user) {
            throw new ApiError(404, "User does not exist")
        }

        const isPasswordvalid = await user.isPasswordCorrect(password)

        if (!isPasswordvalid) {
            throw new ApiError(401, "invalid user credentials")
        }

       const {accessToken, refreshToken} =  await generateAccessAndRefreshTokens(user._id)

       const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

       const options = {
        httpOnly: true,
        secure: true
       }

       return res
       .status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken", refreshToken, options)
       .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
       )


    })

    const logoutUser = asyncHandler(async(req, res) => {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }

        ) 

        const options = {
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged OUt"))
    })

    const refreshAccessToken = asyncHandler(async(req, res) => {
       const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

       if (!refreshAccessToken) {
        throw new ApiError(401, "unauthorized request") 
       }
      try {
         const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
         )
         const user = await User.findById(decodedToken?.id)
  
         if (!user) {
          throw new ApiError(401, "Invalid refresh Token") 
         }
         if (incomingRefreshToken !== user?.refreshToken) {
          throw new ApiError(401, "RfreshToken is expore or used")
         }
  
         const options = {
          httpOnly : true,
          secure: true
         }
         const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
         return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newrefreshToken, options)
         .json(
          new ApiResponse(
              200,
              {accessToken, refreshToken: newrefreshToken},
              "Access token refreshed"
  
  
          )
         )
      } catch (error) {
        throw new ApiError(401, error)?.message || "Invalid refreshToken"
      }
    })

    const changeCurrentPassword = asyncHandler(async(req, res) => {
        const {oldPassword, newPassword} = req.body
        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
        if(!isPasswordCorrect){
            throw new ApiError(400, "Invalid old password")
        }
        user.password = newPassword
        await user.save({validateBeforeSave: false})

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "password change successfully"))
    })
    const getCurrentUser = asyncHandler(async(req, res) => {
        return res
        .status(200)
        .json(200, req.user, "current user fetched successfully")
    })

    const updateAccountDetails = asyncHandler(async(req, res) => {
        const {fullName, email} = req.body

        if(!fullName || !email){
            throw new ApiError(400, "All field are required ")
        }
        const user = User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email
                }
            },
            {new: true}
        
        ).select("-password")
        return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated, successfully "))
    })
    const updateUserAvatar = asyncHandler(async(req, res) => {
        const avatarLocalPath = req.file?.path
        if(!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is missing")
        }
        const avatar = await uploadOncloudinary(avatarLocalPath)
        if(!avatar.url){
          throw new ApiError(400, "Error while upload on Avatar")  
        }
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar: avatar.url
                }

            },
            {new: true}
        ).select("-password")
        return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"))
    })
    const updateUserCoverImage = asyncHandler(async(req, res) => {
        const coverImageLocalPath = req.file?.path
        if(!coverImageLocalPath) {
            throw new ApiError(400, "coverImage file is missing")
        }
        const coverImage = await uploadOncloudinary(coverImageLocalPath)
        if(!coverImage.url){
          throw new ApiError(400, "Error while upload on coverImage")  
        }
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage: coverImage.url
                }

            },
            {new: true}
        ).select("-password")

        return res
        .status(200)
        .json(new ApiResponse(200, user, "coverImage updated successfully"))
    })




    export {
        registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage

    }