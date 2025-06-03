const { expect } = require("chai");
const { ethers } = require("hardhat");

contractName = "RoomAllocation";

describe("RoomAllocation basic tests", function () {
    let RoomAllocation, contract, owner, student1, student2, student3;
    const totalRooms = 4;

    beforeEach(async function () {
        [owner, student1, student2, student3] = await ethers.getSigners();
        RoomAllocation = await ethers.getContractFactory(contractName);
        contract = await RoomAllocation.deploy(totalRooms);
    });

    it("Should deploy with correct total rooms", async function () {
        expect(await contract.totalRooms()).to.equal(totalRooms);
    });

    it("Should allow students to register and assign different rooms", async function () {
        await contract.connect(student1).registerStudent();
        await contract.connect(student2).registerStudent();
        await contract.connect(student3).registerStudent();
        const roomID1 = await contract.connect(student1).checkAllocation();
        const roomID2 = await contract.connect(student2).checkAllocation();
        const roomID3 = await contract.connect(student3).checkAllocation();
        expect(roomID1+roomID2+roomID3).to.be.above(0);
        expect(roomID1).to.not.equal(roomID2).to.not.equal(roomID3);
    });

    it("Should allow a registered student to set preferences", async function () {
        await contract.connect(student1).registerStudent();
        await expect(contract.connect(student1).setPreferences([0, 1, 2, 3])).to.emit(contract, "PreferencesSet").withArgs(student1.address, [0, 1, 2, 3]);
    });

    it("Should allow students to exchange rooms if preferences match", async function () {
        await contract.connect(student1).registerStudent();
        await contract.connect(student2).registerStudent();
        
        let room1 = await contract.connect(student1).checkAllocation();
        let room2 = await contract.connect(student2).checkAllocation();

        await contract.connect(student1).setPreferences([room2]);
        await contract.connect(student2).setPreferences([room1]);

        await expect(contract.connect(student1).requestExchange(student2.address))
            .to.emit(contract, "RoomExchanged")
            .withArgs(student1.address, student2.address, room2);
    });

    it("Should allow querying student by room ID", async function () {
        await contract.connect(student1).registerStudent();
        const roomID = await contract.connect(student1).checkAllocation();
        expect(await contract.connect(student1).getStudentByRoom(roomID)).to.equal(student1.address);
    });

    it("Should allow multiple students to coordinate room exchanges", async function () {
        await contract.connect(student1).registerStudent();
        await contract.connect(student2).registerStudent();
        await contract.connect(student3).registerStudent();

        const room1 = await contract.connect(student1).checkAllocation();
        const room2 = await contract.connect(student2).checkAllocation();
        const room3 = await contract.connect(student3).checkAllocation();
        console.log("Room Allocations:", room1, room2, room3);
        // Set mutually beneficial preferences
        await contract.connect(student1).setPreferences([room2, room1, room3]);
        await contract.connect(student2).setPreferences([room3, room1, room2]);
        await contract.connect(student3).setPreferences([room1, room3, room2]);
    
        // Call coordinatedExchange
        const tx = await contract.coordinatedExchange();
        const receipt = await tx.wait();
        console.log("Gas used for coordinatedExchange:", receipt.gasUsed.toString());

        // Verify the rooms were swapped
        const newRoom1 = await contract.connect(student1).checkAllocation();
        const newRoom2 = await contract.connect(student2).checkAllocation();
        const newRoom3 = await contract.connect(student3).checkAllocation();
        
        console.log("New Room Allocations:", newRoom1, newRoom2, newRoom3);
        
        expect(newRoom1).to.equal(room2);
        expect(newRoom2).to.equal(room3);
        expect(newRoom3).to.equal(room1);
    });

    it("Should measure gas for registerStudent", async function () {
        const tx = await contract.connect(student1).registerStudent();
        const receipt = await tx.wait();
        console.log("Gas used for registerStudent:", receipt.gasUsed.toString());
    });

    it("Should coordinate room exchanges among 10 students and 8 rooms", async function () {
        const signers = await ethers.getSigners();
        const students = signers.slice(1, 11); // 10 students (signers[1] to signers[10])
        const totalRooms = 8;
    
        const RoomAllocation = await ethers.getContractFactory("RoomAllocation");
        const contract = await RoomAllocation.deploy(totalRooms);
        // await contract.deployed();
    
        // Register students (only first 8 will get rooms, last 2 will be skipped)
        for (let i = 0; i < students.length; i++) {
            try {
                await contract.connect(students[i]).registerStudent();
            } catch (err) {
                console.log(`Student ${i + 1} could not register (likely no rooms left).`);
            }
        }
    
        // Capture room assignments before exchange
        const assigned = [];
        for (let i = 0; i < totalRooms; i++) {
            const student = students[i];
            const room = await contract.connect(student).checkAllocation();
            assigned.push(room);
        }
        console.log("Initial Room Assignments:", assigned);
    
        // Set random preferences for all registered students
        for (let i = 0; i < totalRooms; i++) {
            const student = students[i];
            const prefs = [...Array(totalRooms).keys()];
            // Shuffle preferences
            for (let j = prefs.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [prefs[j], prefs[k]] = [prefs[k], prefs[j]];
            }
            console.log(`Student ${i + 1} preferences:`, prefs);
            await contract.connect(student).setPreferences(prefs);
        }
    
        // Run coordinatedExchange
        const tx = await contract.coordinatedExchange();
        const receipt = await tx.wait();
        console.log("Gas used for coordinatedExchange:", receipt.gasUsed.toString());
    
        // Capture final assignments
        const finalAssignments = new Set();
        for (let i = 0; i < totalRooms; i++) {
            const student = students[i];
            const room = await contract.connect(student).checkAllocation();
            finalAssignments.add(room);
            console.log(`Student ${i + 1} assigned to Room ${room.toString()}`);
        }
    
        // Check no duplicates in room assignments
        expect(finalAssignments.size).to.equal(totalRooms);
    });
    
    it("Should calculate coordination optimality after coordinatedExchange", async function () {
        const signers = await ethers.getSigners();
        const students = signers.slice(1, 9); // 8 students
        const totalRooms = 8;
    
        const RoomAllocation = await ethers.getContractFactory("RoomAllocation");
        const contract = await RoomAllocation.deploy(totalRooms);
        // await contract.deployed();
    
        // Register students
        for (let student of students) {
            await contract.connect(student).registerStudent();
        }
    
        // Set preferences for each student
        const allPrefs = {};
        for (let i = 0; i < students.length; i++) {
            const prefs = [...Array(totalRooms).keys()];
            // Shuffle
            for (let j = prefs.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [prefs[j], prefs[k]] = [prefs[k], prefs[j]];
            }
            allPrefs[students[i].address] = prefs;
            await contract.connect(students[i]).setPreferences(prefs);
        }
    
        // Run coordinatedExchange
        await (await contract.coordinatedExchange()).wait();
    
        // Calculate optimality
        let totalScore = 0;
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const room = await contract.connect(student).checkAllocation();
            const prefs = allPrefs[student.address];
            const index = prefs.indexOf(Number(room.toString()));
    
            let score = 0;
            if (index !== -1) {
                score = (prefs.length - index) / prefs.length;
            }
    
            totalScore += score;
    
            console.log(`Student ${i + 1} → Room ${room.toString()} → Score: ${score.toFixed(2)}`);
        }
    
        const optimality = (totalScore / students.length) * 100;
        console.log(`Coordination Optimality: ${optimality.toFixed(2)}%`);
    });
    
    
});

