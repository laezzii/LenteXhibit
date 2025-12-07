/**
 * Database Seeding Script
 * Populates the database with initial data for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { User, Work, Portfolio, Theme, Vote } = require('../models');

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lentexhibit', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Sample data
const sampleUsers = [
    {
        name: 'Admin User',
        email: 'admin@up.edu.ph',
        userType: 'admin',
        isApproved: true
    },
    {
        name: 'John Dela Cruz',
        email: 'john.delacruz@up.edu.ph',
        userType: 'member',
        batchName: 'Burger',
        cluster: 'Photography',
        position: 'Photography Cluster Head',
        isApproved: true
    },
    {
        name: 'Maria Santos',
        email: 'maria.santos@up.edu.ph',
        userType: 'member',
        batchName: 'Sushi',
        cluster: 'Graphics',
        position: 'Graphics Cluster Head',
        isApproved: true
    },
    {
        name: 'Jose Reyes',
        email: 'jose.reyes@up.edu.ph',
        userType: 'member',
        batchName: 'Mochi',
        cluster: 'Videography',
        position: 'Videography Cluster Head',
        isApproved: true
    },
    {
        name: 'Pending Member',
        email: 'pending.member@up.edu.ph',
        userType: 'member',
        batchName: 'Tempura',
        cluster: 'Graphics',
        position: 'Graphics Member',
        isApproved: false
    },
    {
        name: 'Guest User',
        email: 'guest@example.com',
        userType: 'guest',
        isApproved: true
    }
];

const sampleThemes = [
    {
        title: 'Yolanda Resilience',
        description: 'Capturing the spirit of resilience and recovery in Eastern Visayas after Super Typhoon Yolanda',
        category: 'Photos',
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-30'),
        status: 'Ended'
    },
    {
        title: 'Digital Art Revolution',
        description: 'Showcasing innovative digital art and graphic design that pushes creative boundaries',
        category: 'Graphics',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-31'),
        status: 'Active'
    },
    {
        title: 'Stories in Motion',
        description: 'Short documentary and narrative videos that tell compelling stories from our community',
        category: 'Videos',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        status: 'Upcoming'
    }
];

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Work.deleteMany({});
        await Portfolio.deleteMany({});
        await Theme.deleteMany({});
        await Vote.deleteMany({});

        // Create users
        console.log('👥 Creating users...');
        const createdUsers = await User.insertMany(sampleUsers);
        console.log(`✅ Created ${createdUsers.length} users`);

        // Get admin and member users
        const admin = createdUsers.find(u => u.userType === 'admin');
        const members = createdUsers.filter(u => u.userType === 'member');

        // Create themes
        console.log('🎨 Creating themes...');
        const themeData = sampleThemes.map(theme => ({
            ...theme,
            createdBy: admin._id
        }));
        const createdThemes = await Theme.insertMany(themeData);
        console.log(`✅ Created ${createdThemes.length} themes`);

        // Create works for each member
        console.log('📸 Creating works...');
        const works = [];
        const categories = ['Photos', 'Graphics', 'Videos'];
        
        for (const member of members) {
            const memberCategory = member.cluster;
            
            // Create 5 works per member
            for (let i = 1; i <= 5; i++) {
                const work = {
                    title: `${memberCategory} Work ${i} by ${member.name}`,
                    description: `This is a sample ${memberCategory.toLowerCase()} work showcasing creativity and skill.`,
                    category: memberCategory,
                    fileUrl: `https://example.com/${memberCategory.toLowerCase()}/${member._id}_${i}.jpg`,
                    userId: member._id,
                    featured: i === 1, // First work is featured
                    voteCount: Math.floor(Math.random() * 50) + 1,
                    themeId: i <= 2 ? createdThemes[Math.floor(Math.random() * createdThemes.length)]._id : null
                };
                works.push(work);
            }
        }

        const createdWorks = await Work.insertMany(works);
        console.log(`✅ Created ${createdWorks.length} works`);

        // Create portfolios for members
        console.log('📂 Creating portfolios...');
        const portfolios = [];
        
        for (const member of members) {
            const memberWorks = createdWorks.filter(w => w.userId.toString() === member._id.toString());
            const totalVotes = memberWorks.reduce((sum, work) => sum + work.voteCount, 0);
            
            const portfolio = {
                userId: member._id,
                title: `${member.name}'s Portfolio`,
                bio: `${member.cluster} enthusiast and ${member.position} of UP Lente. Member of ${member.batchName} batch.`,
                socialMedia: 'https://instagram.com/' + member.name.toLowerCase().replace(' ', ''),
                works: memberWorks.map(w => w._id),
                totalVotes: totalVotes
            };
            portfolios.push(portfolio);
        }

        const createdPortfolios = await Portfolio.insertMany(portfolios);
        console.log(`✅ Created ${createdPortfolios.length} portfolios`);

        // Update theme submissions
        console.log('🗳️  Updating theme submissions...');
        for (const theme of createdThemes) {
            const themeWorks = createdWorks.filter(w => 
                w.themeId && w.themeId.toString() === theme._id.toString()
            );
            theme.submissions = themeWorks.map(w => w._id);
            await theme.save();
        }

        // Create some sample votes
        console.log('❤️  Creating sample votes...');
        const guest = createdUsers.find(u => u.userType === 'guest');
        const votes = [];
        
        // Guest votes for some works
        for (let i = 0; i < Math.min(10, createdWorks.length); i++) {
            votes.push({
                userId: guest._id,
                workId: createdWorks[i]._id,
                themeId: createdWorks[i].themeId
            });
        }

        await Vote.insertMany(votes);
        console.log(`✅ Created ${votes.length} votes`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   Users: ${createdUsers.length}`);
        console.log(`   Works: ${createdWorks.length}`);
        console.log(`   Portfolios: ${createdPortfolios.length}`);
        console.log(`   Themes: ${createdThemes.length}`);
        console.log(`   Votes: ${votes.length}`);
        
        // Ready-to-use login credentials for all user states/roles
        const credentials = [
            { label: 'Admin', email: 'admin@up.edu.ph' },
            { label: 'Member - Photography (approved)', email: 'john.delacruz@up.edu.ph' },
            { label: 'Member - Graphics (approved)', email: 'maria.santos@up.edu.ph' },
            { label: 'Member - Videography (approved)', email: 'jose.reyes@up.edu.ph' },
            { label: 'Member - Graphics (pending approval)', email: 'pending.member@up.edu.ph' },
            { label: 'Guest', email: 'guest@example.com' }
        ];

        console.log('\n🔑 Login Credentials (email-only login via POST /auth/login { email }):');
        credentials.forEach((cred, index) => {
            console.log(`   ${index + 1}. ${cred.label}: ${cred.email}`);
        });

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run seeding
seedDatabase();