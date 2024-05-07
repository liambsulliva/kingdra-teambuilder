export default function Header({ points } : { points: number }) {
    return (
      <div className="p-6 pb-4 flex flex-row justify-between items-center">
        <h1 className="text-3xl font-semibold font-custom">Draft Teambuilder</h1>
        <p>{`Points Remaining: ${points}`}</p>
      </div>
    );
}